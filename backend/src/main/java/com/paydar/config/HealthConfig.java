package com.paydar.config;

import com.paydar.domain.invoice.InvoiceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.stereotype.Component;

/**
 * Custom health indicator that verifies the database is reachable
 * by running a cheap count query. Surfaces as /actuator/health.
 */
@Component("database")
@RequiredArgsConstructor
public class HealthConfig implements HealthIndicator {

    private final InvoiceRepository invoiceRepository;

    @Override
    public Health health() {
        try {
            invoiceRepository.count();
            return Health.up().withDetail("db", "reachable").build();
        } catch (Exception e) {
            return Health.down()
                    .withDetail("db", "unreachable")
                    .withException(e)
                    .build();
        }
    }
}
