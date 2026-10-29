package com.paydar.domain.notification;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, UUID> {

    List<Notification> findAllByInvoiceIdOrderByCreatedAtDesc(UUID invoiceId);

    List<Notification> findAllByStatusOrderByScheduledAtAsc(NotificationStatus status);

    /** Prevent duplicate notifications for the same invoice + rule + channel on the same day. */
    @Query("""
            SELECT COUNT(n) > 0 FROM Notification n
            WHERE n.invoice.id = :invoiceId
              AND n.rule.id    = :ruleId
              AND n.channel    = :channel
              AND CAST(n.scheduledAt AS LocalDate) = :date
            """)
    boolean existsForInvoiceRuleChannelOnDate(
            UUID invoiceId, UUID ruleId, NotificationChannel channel, LocalDate date);

    @Query("SELECT n FROM Notification n JOIN FETCH n.invoice i JOIN FETCH i.client WHERE n.invoice.organisation.id = :orgId ORDER BY n.createdAt DESC")
    List<Notification> findAllByOrganisationIdOrderByCreatedAtDesc(UUID orgId);
}
