package com.paydar.mfa;

import com.paydar.domain.user.User;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/v1/mfa")
@RequiredArgsConstructor
public class MfaController {

    private final MfaService mfaService;

    /** GET /api/v1/mfa/status — is MFA enabled for the current user? */
    @GetMapping("/status")
    public ResponseEntity<Map<String, Boolean>> status(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(Map.of("mfaEnabled", user.isMfaEnabled()));
    }

    /** POST /api/v1/mfa/enrol — begin enrolment, returns QR code */
    @PostMapping("/enrol")
    public ResponseEntity<MfaEnrolResponse> beginEnrol(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(mfaService.beginEnrol(user));
    }

    /** POST /api/v1/mfa/enrol/confirm — confirm with TOTP code, returns backup codes */
    @PostMapping("/enrol/confirm")
    public ResponseEntity<List<String>> confirmEnrol(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody ConfirmRequest body) {
        return ResponseEntity.ok(mfaService.confirmEnrol(user, body.code()));
    }

    /** POST /api/v1/mfa/disable — disable MFA (requires valid TOTP) */
    @PostMapping("/disable")
    public ResponseEntity<Void> disable(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody ConfirmRequest body) {
        mfaService.disable(user, body.code());
        return ResponseEntity.noContent().build();
    }

    public record ConfirmRequest(@NotNull Integer code) {}
}
