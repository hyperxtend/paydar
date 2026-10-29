package com.paydar.notification.channel;

import com.paydar.domain.notification.Notification;
import com.paydar.domain.notification.NotificationChannel;
import com.paydar.domain.notification.NotificationRepository;
import com.paydar.domain.notification.NotificationStatus;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class InAppNotificationSender implements NotificationSender {

    private final SimpMessagingTemplate messagingTemplate;
    private final NotificationRepository notificationRepository;

    @Override
    public NotificationChannel channel() {
        return NotificationChannel.IN_APP;
    }

    @Override
    public void send(Notification notification) {
        try {
            var invoice = notification.getInvoice();

            Map<String, Object> payload = Map.of(
                    "notificationId", notification.getId().toString(),
                    "invoiceId",      invoice.getId().toString(),
                    "invoiceNumber",  invoice.getNumber(),
                    "clientName",     invoice.getClient().getName(),
                    "status",         invoice.getStatus().name(),
                    "total",          invoice.getTotal(),
                    "currency",       invoice.getCurrency(),
                    "message",        "Invoice %s from %s is %s"
                            .formatted(invoice.getNumber(), invoice.getClient().getName(), invoice.getStatus().name().toLowerCase())
            );

            // recipient holds the user ID (UUID as string) for in-app notifications
            messagingTemplate.convertAndSendToUser(
                    notification.getRecipient(),
                    "/queue/notifications",
                    payload
            );

            notification.setStatus(NotificationStatus.SENT);
            notification.setSentAt(Instant.now());
            log.info("In-app notification sent for invoice {} to user {}", invoice.getNumber(), notification.getRecipient());

        } catch (Exception e) {
            notification.setStatus(NotificationStatus.FAILED);
            notification.setErrorMessage(e.getMessage());
            log.error("Failed to send in-app notification for invoice {}: {}", notification.getInvoice().getNumber(), e.getMessage());
        }

        notificationRepository.save(notification);
    }
}
