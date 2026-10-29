package com.paydar.notification.channel;

import com.paydar.domain.notification.Notification;
import com.paydar.domain.notification.NotificationChannel;
import com.paydar.domain.notification.NotificationRepository;
import com.paydar.domain.notification.NotificationStatus;
import com.twilio.rest.api.v2010.account.Message;
import com.twilio.type.PhoneNumber;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.time.Instant;

@Component
@RequiredArgsConstructor
@Slf4j
public class WhatsAppNotificationSender implements NotificationSender {

    private final NotificationRepository notificationRepository;

    @Value("${app.twilio.whatsapp-from:}")
    private String whatsappFrom;

    @Override
    public NotificationChannel channel() {
        return NotificationChannel.WHATSAPP;
    }

    @Override
    public void send(Notification notification) {
        if (!StringUtils.hasText(notification.getRecipient())) {
            notification.setStatus(NotificationStatus.SKIPPED);
            notification.setErrorMessage("No phone number on record for this client");
            notificationRepository.save(notification);
            return;
        }

        try {
            var invoice = notification.getInvoice();
            String body = """
                    *Paydar — Invoice Reminder*
                    Invoice: *%s*
                    Amount: *%s %,.2f*
                    Status: *%s*
                    Due: *%s*
                    Please arrange payment at your earliest convenience.
                    """.formatted(
                    invoice.getNumber(),
                    invoice.getCurrency(),
                    invoice.getTotal(),
                    invoice.getStatus().name(),
                    invoice.getDueDate()
            );

            // WhatsApp numbers are prefixed with "whatsapp:"
            String toWhatsApp = notification.getRecipient().startsWith("whatsapp:")
                    ? notification.getRecipient()
                    : "whatsapp:" + notification.getRecipient();

            Message.creator(
                    new PhoneNumber(toWhatsApp),
                    new PhoneNumber(whatsappFrom),
                    body
            ).create();

            notification.setStatus(NotificationStatus.SENT);
            notification.setSentAt(Instant.now());
            log.info("WhatsApp sent for invoice {} to {}", invoice.getNumber(), notification.getRecipient());

        } catch (Exception e) {
            notification.setStatus(NotificationStatus.FAILED);
            notification.setErrorMessage(e.getMessage());
            log.error("Failed to send WhatsApp for invoice {}: {}", notification.getInvoice().getNumber(), e.getMessage());
        }

        notificationRepository.save(notification);
    }
}
