package com.paydar.notification.dto;

import com.paydar.domain.notification.Notification;
import com.paydar.domain.notification.NotificationChannel;
import com.paydar.domain.notification.NotificationStatus;

import java.time.Instant;
import java.util.UUID;

public record NotificationResponse(
        UUID id,
        UUID invoiceId,
        String invoiceNumber,
        String clientName,
        NotificationChannel channel,
        String recipient,
        NotificationStatus status,
        Instant scheduledAt,
        Instant sentAt,
        String errorMessage
) {
    public static NotificationResponse from(Notification n) {
        return new NotificationResponse(
                n.getId(),
                n.getInvoice().getId(),
                n.getInvoice().getNumber(),
                n.getInvoice().getClient().getName(),
                n.getChannel(),
                n.getRecipient(),
                n.getStatus(),
                n.getScheduledAt(),
                n.getSentAt(),
                n.getErrorMessage()
        );
    }
}
