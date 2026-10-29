package com.paydar.domain.notification;

import com.paydar.domain.organisation.Organisation;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "notification_rules")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationRule {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organisation_id", nullable = false)
    private Organisation organisation;

    @Column(nullable = false)
    private String name;

    /**
     * Days relative to invoice due date.
     * Negative = before due (pre-reminder), 0 = on due date, positive = after due (overdue reminder).
     */
    @Column(name = "trigger_days_offset", nullable = false)
    private int triggerDaysOffset;

    @ElementCollection(targetClass = NotificationChannel.class, fetch = FetchType.EAGER)
    @CollectionTable(
            name = "notification_rule_channels",
            joinColumns = @JoinColumn(name = "rule_id")
    )
    @Enumerated(EnumType.STRING)
    @Column(name = "channel")
    @Builder.Default
    private Set<NotificationChannel> channels = new HashSet<>();

    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;
}
