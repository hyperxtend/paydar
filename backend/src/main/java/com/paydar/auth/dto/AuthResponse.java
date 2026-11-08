package com.paydar.auth.dto;

import com.paydar.user.dto.UserResponse;

public record AuthResponse(
        String      accessToken,
        String      refreshToken,
        String      tokenType,
        UserResponse user,
        boolean     mfaRequired,   // true → client must POST to /auth/mfa-verify
        String      mfaPendingToken // short-lived token used only for MFA verification
) {
    /** Normal login (no MFA). */
    public static AuthResponse of(String accessToken, String refreshToken, UserResponse user) {
        return new AuthResponse(accessToken, refreshToken, "Bearer", user, false, null);
    }

    /** MFA step-up required — no access token yet. */
    public static AuthResponse mfaChallenge(String mfaPendingToken) {
        return new AuthResponse(null, null, "Bearer", null, true, mfaPendingToken);
    }
}
