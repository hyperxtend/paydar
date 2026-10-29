package com.paydar.config;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.io.IOException;

/**
 * Adds security-hardening HTTP response headers to every response.
 */
@Component
@Order(1)
public class SecurityHeadersFilter implements Filter {

    @Override
    public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain)
            throws IOException, ServletException {

        HttpServletResponse response = (HttpServletResponse) res;

        // Prevent clickjacking
        response.setHeader("X-Frame-Options", "DENY");

        // Stop MIME-type sniffing
        response.setHeader("X-Content-Type-Options", "nosniff");

        // Force HTTPS for 1 year (includeSubDomains)
        response.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");

        // Disable referrer leakage cross-origin
        response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

        // Permissions policy — disable browser features we don't use
        response.setHeader("Permissions-Policy",
                "camera=(), microphone=(), geolocation=(), payment=()");

        // Content Security Policy — tight for an API, relaxed if serving HTML
        response.setHeader("Content-Security-Policy",
                "default-src 'none'; frame-ancestors 'none'");

        // Remove server fingerprint header
        response.setHeader("Server", "");

        chain.doFilter(req, res);
    }
}
