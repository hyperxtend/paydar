package com.paydar.notification;

import com.paydar.domain.invoice.Invoice;
import com.paydar.domain.invoice.InvoiceRepository;
import com.paydar.domain.invoice.InvoiceStatus;
import com.paydar.domain.notification.*;
import com.paydar.notification.channel.NotificationSender;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@Slf4j
public class NotificationService {

    private final InvoiceRepository invoiceRepository;
    private final NotificationRuleRepository ruleRepository;
    private final NotificationRepository notificationRepository;
    private final Map<NotificationChannel, NotificationSender> senders;

    public NotificationService(
            InvoiceRepository invoiceRepository,
            NotificationRuleRepository ruleRepository,
            NotificationRepository notificationRepository,
            List<NotificationSender> senderList
    ) {
        this.invoiceRepository      = invoiceRepository;
        this.ruleRepository         = ruleRepository;
        this.notificationRepository = notificationRepository;
        this.senders = senderList.stream()
                .collect(Collectors.toMap(NotificationSender::channel, Function.identity()));
    }

    // ── Overdue detection (run nightly) ────────────────────────────────────

    @Transactional
    public void detectAndMarkOverdue() {
        LocalDate today = LocalDate.now();
        List<Invoice> overdue = invoiceRepository.findAll().stream()
                .filter(i -> (i.getStatus() == InvoiceStatus.SENT
                        || i.getStatus() == InvoiceStatus.PARTIALLY_PAID)
                        && i.getDueDate().isBefore(today))
                .toList();

        for (Invoice invoice : overdue) {
            invoice.transitionTo(InvoiceStatus.OVERDUE);
            invoiceRepository.save(invoice);
            log.info("Marked invoice {} as OVERDUE", invoice.getNumber());
        }

        log.info("Overdue detection complete. {} invoice(s) marked overdue.", overdue.size());
    }

    // ── Rule-based dispatch (run daily) ────────────────────────────────────

    @Transactional
    public void dispatchScheduledNotifications() {
        LocalDate today = LocalDate.now();

        // Get all active rules across all orgs
        List<NotificationRule> allRules = ruleRepository.findAll().stream()
                .filter(NotificationRule::isActive)
                .toList();

        for (NotificationRule rule : allRules) {
            // Target date = due date that, offset by the rule, lands on today
            // e.g. offset=-7 means invoices due today+7 days; offset=3 means invoices due today-3 days
            LocalDate targetDueDate = today.minusDays(rule.getTriggerDaysOffset());

            List<Invoice> matchingInvoices = invoiceRepository
                    .findAllByOrganisationIdOrderByCreatedAtDesc(rule.getOrganisation().getId())
                    .stream()
                    .filter(i -> i.getDueDate().equals(targetDueDate))
                    .filter(i -> isEligibleForRule(i, rule))
                    .toList();

            for (Invoice invoice : matchingInvoices) {
                for (NotificationChannel channel : rule.getChannels()) {
                    queueAndDispatch(invoice, rule, channel, today);
                }
            }
        }
    }

    // ── Manual ping ────────────────────────────────────────────────────────

    @Transactional
    public void sendManualNotification(UUID invoiceId, UUID orgId, NotificationChannel channel) {
        Invoice invoice = invoiceRepository.findByIdAndOrganisationId(invoiceId, orgId)
                .orElseThrow(() -> new IllegalArgumentException("Invoice not found: " + invoiceId));

        Notification notification = Notification.builder()
                .invoice(invoice)
                .channel(channel)
                .recipient(resolveRecipient(invoice, channel))
                .scheduledAt(Instant.now())
                .build();

        notificationRepository.save(notification);
        dispatch(notification);
    }

    // ── History ────────────────────────────────────────────────────────────

    public List<Notification> findAllByOrg(UUID orgId) {
        return notificationRepository.findAllByOrganisationIdOrderByCreatedAtDesc(orgId);
    }

    public List<Notification> findByInvoice(UUID invoiceId) {
        return notificationRepository.findAllByInvoiceIdOrderByCreatedAtDesc(invoiceId);
    }

    // ── Internals ──────────────────────────────────────────────────────────

    private void queueAndDispatch(Invoice invoice, NotificationRule rule,
                                   NotificationChannel channel, LocalDate today) {
        // Deduplication: skip if already sent today for this invoice+rule+channel
        if (notificationRepository.existsForInvoiceRuleChannelOnDate(
                invoice.getId(), rule.getId(), channel, today)) {
            log.debug("Skipping duplicate notification for invoice {} rule {} channel {}",
                    invoice.getNumber(), rule.getName(), channel);
            return;
        }

        Notification notification = Notification.builder()
                .invoice(invoice)
                .rule(rule)
                .channel(channel)
                .recipient(resolveRecipient(invoice, channel))
                .scheduledAt(Instant.now())
                .build();

        notificationRepository.save(notification);
        dispatch(notification);
    }

    private void dispatch(Notification notification) {
        NotificationSender sender = senders.get(notification.getChannel());
        if (sender == null) {
            log.warn("No sender registered for channel {}", notification.getChannel());
            notification.setStatus(NotificationStatus.FAILED);
            notification.setErrorMessage("No sender configured for channel: " + notification.getChannel());
            notificationRepository.save(notification);
            return;
        }
        sender.send(notification);
    }

    private String resolveRecipient(Invoice invoice, NotificationChannel channel) {
        return switch (channel) {
            case EMAIL    -> invoice.getClient().getEmail();
            case SMS, WHATSAPP -> invoice.getClient().getPhone() != null
                    ? invoice.getClient().getPhone() : "";
            case IN_APP   -> invoice.getOrganisation().getId().toString();
        };
    }

    private boolean isEligibleForRule(Invoice invoice, NotificationRule rule) {
        // Pre-due reminders: invoice must be SENT or PARTIALLY_PAID
        if (rule.getTriggerDaysOffset() <= 0) {
            return invoice.getStatus() == InvoiceStatus.SENT
                    || invoice.getStatus() == InvoiceStatus.PARTIALLY_PAID;
        }
        // Post-due reminders: invoice must be OVERDUE or PARTIALLY_PAID
        return invoice.getStatus() == InvoiceStatus.OVERDUE
                || invoice.getStatus() == InvoiceStatus.PARTIALLY_PAID;
    }
}
