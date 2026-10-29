package com.paydar.auth;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.Map;
import java.util.function.Function;

@Service
public class JwtService {

    @Value("${app.jwt.secret}")
    private String secretKey;

    @Value("${app.jwt.expiration}")
    private long jwtExpiration;

    @Value("${app.jwt.refresh-expiration}")
    private long refreshExpiration;

    // ── Token generation ───────────────────────────────────────────────────

    private static final String CLAIM_TOKEN_TYPE = "token_type";
    private static final String TYPE_MFA_PENDING  = "mfa_pending";
    private static final long   MFA_PENDING_TTL   = 5 * 60 * 1000L; // 5 minutes

    public String generateAccessToken(UserDetails userDetails) {
        return buildToken(Map.of(), userDetails, jwtExpiration);
    }

    public String generateRefreshToken(UserDetails userDetails) {
        return buildToken(Map.of(), userDetails, refreshExpiration);
    }

    /** Short-lived token issued after password verification when MFA is required. */
    public String generateMfaPendingToken(UserDetails userDetails) {
        return buildToken(Map.of(CLAIM_TOKEN_TYPE, TYPE_MFA_PENDING), userDetails, MFA_PENDING_TTL);
    }

    public boolean isMfaPendingToken(String token) {
        try {
            String type = extractClaim(token, claims -> claims.get(CLAIM_TOKEN_TYPE, String.class));
            return TYPE_MFA_PENDING.equals(type) && !isTokenExpired(token);
        } catch (Exception e) {
            return false;
        }
    }

    private String buildToken(Map<String, Object> extraClaims, UserDetails userDetails, long expiration) {
        return Jwts.builder()
                .claims(extraClaims)
                .subject(userDetails.getUsername())
                .issuedAt(new Date(System.currentTimeMillis()))
                .expiration(new Date(System.currentTimeMillis() + expiration))
                .signWith(getSignInKey())
                .compact();
    }

    // ── Token validation ───────────────────────────────────────────────────

    public boolean isTokenValid(String token, UserDetails userDetails) {
        final String username = extractUsername(token);
        return username.equals(userDetails.getUsername()) && !isTokenExpired(token);
    }

    public boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }

    // ── Claims extraction ──────────────────────────────────────────────────

    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    private Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        return claimsResolver.apply(extractAllClaims(token));
    }

    private Claims extractAllClaims(String token) {
        return Jwts.parser()
                .verifyWith(getSignInKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    private SecretKey getSignInKey() {
        byte[] keyBytes = Decoders.BASE64.decode(secretKey);
        return Keys.hmacShaKeyFor(keyBytes);
    }
}
