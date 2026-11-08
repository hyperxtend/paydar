package com.paydar.audit;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

/**
 * Immutable audit trail — records security-sensitive events.
 * Written on: login (success/failure), register, password change,
 *             MFA enroll/verify, invoice status transitions, payment recording.
 */
@Entity
@Table(name = "audit_logs",
       indexes = {
           @Index(name = "idx_audit_org_id",    columnList = "organisation_id"),
           @Index(name = "idx_audit_actor_id",  columnList = "actor_id"),
           @Index(name = "idx_audit_created_at",columnList = "created_at DESC"),
       })
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "organisation_id")
    private UUID organisationId;

    @Column(name = "actor_id")
    private UUID actorId;

    @Column(name = "actor_email", length = 255)
    private String actorEmail;

    @Column(nullable = false, length = 100)
    private String action;          // e.g. LOGIN_SUCCESS, INVOICE_VOIDED

    @Column(name = "resource_type", length = 100)
    private String resourceType;    // e.g. Invoice, Payment

    @Column(name = "resource_id", length = 100)
    private String resourceId;

    @Column(columnDefinition = "TEXT")
    private String detail;          // JSON or human-readable context

    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    @Column(name = "user_agent", length = 500)
    private String userAgent;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
