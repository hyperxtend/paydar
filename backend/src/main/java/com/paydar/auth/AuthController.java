package com.paydar.auth;

import com.paydar.auth.dto.AuthResponse;
import com.paydar.auth.dto.LoginRequest;
import com.paydar.auth.dto.RegisterRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    /**
     * POST /api/v1/auth/register
     * Register a new organisation and its first admin user.
     */
    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.register(request));
    }

    /**
     * POST /api/v1/auth/login
     * Authenticate with email and password.
     * If MFA is enabled, returns mfaRequired=true + mfaPendingToken (no accessToken).
     */
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    /**
     * POST /api/v1/auth/mfa-verify
     * Complete login by verifying a TOTP code after password-only auth.
     */
    @PostMapping("/mfa-verify")
    public ResponseEntity<AuthResponse> mfaVerify(@Valid @RequestBody MfaVerifyRequest request) {
        return ResponseEntity.ok(authService.verifyMfa(request.mfaPendingToken(), request.code()));
    }

    public record MfaVerifyRequest(
            @jakarta.validation.constraints.NotBlank String mfaPendingToken,
            @jakarta.validation.constraints.NotBlank String code
    ) {}
}
