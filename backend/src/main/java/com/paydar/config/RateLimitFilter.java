package com.paydar.config;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Per-IP rate limiting on sensitive endpoints using Bucket4j.
 *
 * Auth endpoints:   10 requests / minute  (login, register)
 * All other API:   120 requests / minute
 *
 * In production, replace the in-memory map with a Redis-backed Bucket4j
 * ProxyManager so limits survive restarts and scale horizontally.
 */
@Component
@Order(2)
public class RateLimitFilter implements Filter {

    private final Map<String, Bucket> authBuckets  = new ConcurrentHashMap<>();
    private final Map<String, Bucket> globalBuckets = new ConcurrentHashMap<>();

    @Override
    public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain)
            throws IOException, ServletException {

        HttpServletRequest  request  = (HttpServletRequest)  req;
        HttpServletResponse response = (HttpServletResponse) res;

        String ip   = resolveClientIp(request);
        String path = request.getRequestURI();

        Bucket bucket = isAuthPath(path)
                ? authBuckets.computeIfAbsent(ip, k -> buildAuthBucket())
                : globalBuckets.computeIfAbsent(ip, k -> buildGlobalBucket());

        if (bucket.tryConsume(1)) {
            chain.doFilter(req, res);
        } else {
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType("application/json");
            response.getWriter().write(
                    "{\"error\":\"Too many requests — please slow down and try again shortly.\"}");
        }
    }

    // ── Bucket factories ──────────────────────────────────────────────────

    /** 10 tokens, refills 10 per minute. */
    private Bucket buildAuthBucket() {
        return Bucket.builder()
                .addLimit(Bandwidth.classic(10, Refill.intervally(10, Duration.ofMinutes(1))))
                .build();
    }

    /** 120 tokens, refills 120 per minute. */
    private Bucket buildGlobalBucket() {
        return Bucket.builder()
                .addLimit(Bandwidth.classic(120, Refill.intervally(120, Duration.ofMinutes(1))))
                .build();
    }

    // ── Helpers ───────────────────────────────────────────────────────────

    private boolean isAuthPath(String path) {
        return path.contains("/v1/auth/");
    }

    /** Respect X-Forwarded-For when sitting behind a reverse proxy. */
    private String resolveClientIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            return xff.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
