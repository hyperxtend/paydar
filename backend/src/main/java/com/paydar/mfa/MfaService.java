package com.paydar.mfa;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import com.paydar.domain.user.User;
import com.paydar.domain.user.UserRepository;
import com.warrenstrange.googleauth.GoogleAuthenticator;
import com.warrenstrange.googleauth.GoogleAuthenticatorKey;
import com.warrenstrange.googleauth.GoogleAuthenticatorQRGenerator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class MfaService {

    private static final String APP_NAME   = "Paydar";
    private static final int    BACKUP_CODE_COUNT = 8;
    private static final int    QR_SIZE    = 300;

    private final UserRepository  userRepository;
    private final PasswordEncoder passwordEncoder;
    private final ObjectMapper    objectMapper;
    private final GoogleAuthenticator googleAuth = new GoogleAuthenticator();

    // ── Enrol ─────────────────────────────────────────────────────────────

    /**
     * Step 1 — generate a TOTP secret and return the QR code PNG as Base64.
     * The secret is saved to the user record but MFA is NOT yet enabled;
     * the client must confirm with a valid code first (see confirmEnrol).
     */
    @Transactional
    public MfaEnrolResponse beginEnrol(User user) {
        GoogleAuthenticatorKey credentials = googleAuth.createCredentials();
        String secret = credentials.getKey();

        user.setMfaSecret(secret);
        userRepository.save(user);

        String otpAuthUrl = GoogleAuthenticatorQRGenerator.getOtpAuthTotpURL(
                APP_NAME, user.getEmail(), credentials);

        String qrBase64 = generateQrBase64(otpAuthUrl);
        return new MfaEnrolResponse(secret, qrBase64, otpAuthUrl);
    }

    /**
     * Step 2 — verify a TOTP code from the authenticator app.
     * If valid, enable MFA and generate backup codes.
     */
    @Transactional
    public List<String> confirmEnrol(User user, int totpCode) {
        if (user.getMfaSecret() == null) {
            throw new IllegalStateException("MFA enrolment not started — call beginEnrol first.");
        }
        if (!googleAuth.authorize(user.getMfaSecret(), totpCode)) {
            throw new IllegalArgumentException("Invalid TOTP code.");
        }

        List<String> plainCodes  = generateBackupCodes();
        List<String> hashedCodes = plainCodes.stream().map(passwordEncoder::encode).toList();

        user.setMfaEnabled(true);
        user.setMfaBackupCodes(toJson(hashedCodes));
        userRepository.save(user);

        return plainCodes; // shown ONCE — user must save these
    }

    // ── Verify (login step-up) ─────────────────────────────────────────────

    /**
     * Returns true if the provided code is a valid TOTP code OR a valid backup code.
     * Backup codes are single-use and removed on consumption.
     */
    @Transactional
    public boolean verify(User user, String code) {
        if (!user.isMfaEnabled()) return true; // MFA not required

        // Try TOTP first
        try {
            int totp = Integer.parseInt(code.replaceAll("\\s", ""));
            if (googleAuth.authorize(user.getMfaSecret(), totp)) return true;
        } catch (NumberFormatException ignored) {
            // not a numeric TOTP — fall through to backup code check
        }

        // Try backup codes
        return consumeBackupCode(user, code);
    }

    // ── Disable MFA ───────────────────────────────────────────────────────

    @Transactional
    public void disable(User user, int totpCode) {
        if (!googleAuth.authorize(user.getMfaSecret(), totpCode)) {
            throw new IllegalArgumentException("Invalid TOTP code — cannot disable MFA.");
        }
        user.setMfaEnabled(false);
        user.setMfaSecret(null);
        user.setMfaBackupCodes(null);
        userRepository.save(user);
    }

    // ── Private helpers ───────────────────────────────────────────────────

    private boolean consumeBackupCode(User user, String raw) {
        if (user.getMfaBackupCodes() == null) return false;
        List<String> hashed = fromJson(user.getMfaBackupCodes());
        for (String h : hashed) {
            if (passwordEncoder.matches(raw.trim(), h)) {
                List<String> remaining = new ArrayList<>(hashed);
                remaining.remove(h);
                user.setMfaBackupCodes(toJson(remaining));
                userRepository.save(user);
                log.info("Backup code consumed for user {}", user.getId());
                return true;
            }
        }
        return false;
    }

    private List<String> generateBackupCodes() {
        SecureRandom rng   = new SecureRandom();
        List<String> codes = new ArrayList<>(BACKUP_CODE_COUNT);
        for (int i = 0; i < BACKUP_CODE_COUNT; i++) {
            // 8-char alphanumeric code
            codes.add(Long.toHexString(rng.nextLong() & 0xFFFFFFFFL).toUpperCase()
                    .substring(0, 8));
        }
        return codes;
    }

    private String generateQrBase64(String otpAuthUrl) {
        try {
            QRCodeWriter writer = new QRCodeWriter();
            BitMatrix matrix    = writer.encode(otpAuthUrl, BarcodeFormat.QR_CODE, QR_SIZE, QR_SIZE);
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            MatrixToImageWriter.writeToStream(matrix, "PNG", out);
            return "data:image/png;base64," + Base64.getEncoder().encodeToString(out.toByteArray());
        } catch (Exception e) {
            throw new RuntimeException("QR code generation failed", e);
        }
    }

    private String toJson(List<String> list) {
        try { return objectMapper.writeValueAsString(list); }
        catch (Exception e) { throw new RuntimeException(e); }
    }

    private List<String> fromJson(String json) {
        try { return objectMapper.readValue(json, new TypeReference<>() {}); }
        catch (Exception e) { return new ArrayList<>(); }
    }
}
