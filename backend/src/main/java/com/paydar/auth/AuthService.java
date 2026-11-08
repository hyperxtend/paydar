package com.paydar.auth;

import com.paydar.auth.dto.AuthResponse;
import com.paydar.auth.dto.LoginRequest;
import com.paydar.auth.dto.RegisterRequest;
import com.paydar.domain.organisation.Organisation;
import com.paydar.domain.organisation.OrganisationRepository;
import com.paydar.domain.user.Role;
import com.paydar.domain.user.User;
import com.paydar.domain.user.UserRepository;
import com.paydar.mfa.MfaService;
import com.paydar.user.dto.UserResponse;
import jakarta.persistence.EntityExistsException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository          userRepository;
    private final OrganisationRepository  organisationRepository;
    private final PasswordEncoder         passwordEncoder;
    private final JwtService              jwtService;
    private final AuthenticationManager   authenticationManager;
    private final MfaService              mfaService;

    /**
     * Register the first user for a new organisation.
     * The registering user is automatically assigned the ADMIN role.
     */
    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new EntityExistsException("An account with this email already exists");
        }

        Organisation organisation = organisationRepository.save(
                Organisation.builder()
                        .name(request.organisationName())
                        .build()
        );

        User user = userRepository.save(
                User.builder()
                        .firstName(request.firstName())
                        .lastName(request.lastName())
                        .email(request.email())
                        .passwordHash(passwordEncoder.encode(request.password()))
                        .role(Role.ADMIN)
                        .organisation(organisation)
                        .build()
        );

        return buildAuthResponse(user);
    }

    /**
     * Authenticate with email + password.
     * If MFA is enabled, returns a short-lived pending token and mfaRequired=true.
     * The client must then call verifyMfa() to receive the real tokens.
     */
    public AuthResponse login(LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.email(), request.password())
        );

        User user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new IllegalStateException("User not found after authentication"));

        if (user.isMfaEnabled()) {
            // Issue a short-lived MFA-pending token (5 minutes)
            String pendingToken = jwtService.generateMfaPendingToken(user);
            return AuthResponse.mfaChallenge(pendingToken);
        }

        return buildAuthResponse(user);
    }

    /**
     * Step-up: verify the TOTP code supplied after a password-only login.
     * The mfaPendingToken proves credentials were already verified.
     */
    public AuthResponse verifyMfa(String mfaPendingToken, String totpCode) {
        if (!jwtService.isMfaPendingToken(mfaPendingToken)) {
            throw new BadCredentialsException("Invalid or expired MFA pending token.");
        }
        String email = jwtService.extractUsername(mfaPendingToken);
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BadCredentialsException("User not found."));

        if (!mfaService.verify(user, totpCode)) {
            throw new BadCredentialsException("Invalid MFA code.");
        }

        return buildAuthResponse(user);
    }

    private AuthResponse buildAuthResponse(User user) {
        String accessToken  = jwtService.generateAccessToken(user);
        String refreshToken = jwtService.generateRefreshToken(user);
        return AuthResponse.of(accessToken, refreshToken, UserResponse.from(user));
    }
}
