package com.paydar.mfa;

public record MfaEnrolResponse(
        String secret,       // Base32 secret — shown for manual entry
        String qrCodeBase64, // data:image/png;base64,... — render as <img>
        String otpAuthUrl    // otpauth:// URL for deep-linking into authenticator apps
) {}
