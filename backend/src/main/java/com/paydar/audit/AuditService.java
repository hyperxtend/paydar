package com.paydar.audit;

import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Fire-and-forget audit writer.
 * Called @Async so it never slows down the request path.
 * Uses REQUIRES_NEW so a rollback in the main tx doesn't lose the audit entry.
 */
@Service
@RequiredArgsConstructor
public class AuditService {

    private final AuditLogRepository repo;

    @Async
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void log(
            UUID orgId,
            UUID actorId,
            String actorEmail,
            String action,
            String resourceType,
            String resourceId,
            String detail,
            String ipAddress,
            String userAgent
    ) {
        repo.save(AuditLog.builder()
                .organisationId(orgId)
                .actorId(actorId)
                .actorEmail(actorEmail)
                .action(action)
                .resourceType(resourceType)
                .resourceId(resourceId)
                .detail(detail)
                .ipAddress(ipAddress)
                .userAgent(userAgent)
                .build());
    }

    /** Convenience overload for system events with no actor. */
    @Async
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logSystem(String action, String resourceType, String resourceId, String detail) {
        repo.save(AuditLog.builder()
                .action(action)
                .resourceType(resourceType)
                .resourceId(resourceId)
                .detail(detail)
                .build());
    }
}
