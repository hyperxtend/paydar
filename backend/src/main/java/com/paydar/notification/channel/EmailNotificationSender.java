package com.paydar.notification.channel;

import com.paydar.domain.invoice.Invoice;
import com.paydar.domain.notification.Notification;
import com.paydar.domain.notification.NotificationChannel;
import com.paydar.domain.notification.NotificationRepository;
import com.paydar.domain.notification.NotificationStatus;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;

import java.time.Instant;

@Component
@RequiredArgsConstructor
@Slf4j
public class EmailNotificationSender implements NotificationSender {

    private final JavaMailSender mailSender;
    private final NotificationRepository notificationRepository;

    @Value("${app.mail.from}")
    private String fromAddress;

    @Value("${app.mail.from-name}")
    private String fromName;

    @Override
    public NotificationChannel channel() {
        return NotificationChannel.EMAIL;
    }

    @Override
    public void send(Notification notification) {
        try {
            Invoice invoice = notification.getInvoice();
            String subject  = buildSubject(invoice);
            String body     = buildHtmlBody(invoice);

            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromAddress, fromName);
            helper.setTo(notification.getRecipient());
            helper.setSubject(subject);
            helper.setText(body, true);

            mailSender.send(message);

            notification.setStatus(NotificationStatus.SENT);
            notification.setSentAt(Instant.now());
            log.info("Email sent for invoice {} to {}", invoice.getNumber(), notification.getRecipient());

        } catch (Exception e) {
            notification.setStatus(NotificationStatus.FAILED);
            notification.setErrorMessage(e.getMessage());
            log.error("Failed to send email for invoice {}: {}", notification.getInvoice().getNumber(), e.getMessage());
        }

        notificationRepository.save(notification);
    }

    private String buildSubject(Invoice invoice) {
        return switch (invoice.getStatus()) {
            case OVERDUE -> "Payment overdue: %s".formatted(invoice.getNumber());
            case SENT    -> "Invoice %s — payment due %s".formatted(invoice.getNumber(), invoice.getDueDate());
            default      -> "Reminder: Invoice %s".formatted(invoice.getNumber());
        };
    }

    private String buildHtmlBody(Invoice invoice) {
        String clientName  = invoice.getClient().getName();
        String invoiceNum  = invoice.getNumber();
        String amount      = "%s %.2f".formatted(invoice.getCurrency(), invoice.getTotal());
        String dueDate     = invoice.getDueDate().toString();

        return """
                <!DOCTYPE html>
                <html>
                <body style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 32px;">
                  <h2 style="color: #4f46e5;">Paydar</h2>
                  <p>Dear %s,</p>
                  <p>This is a reminder about invoice <strong>%s</strong> for <strong>%s</strong>, due on <strong>%s</strong>.</p>
                  <table style="border-collapse: collapse; width: 100%%; margin: 24px 0;">
                    <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">Invoice</td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>%s</strong></td></tr>
                    <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">Amount</td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>%s</strong></td></tr>
                    <tr><td style="padding: 8px;">Due date</td><td style="padding: 8px;"><strong>%s</strong></td></tr>
                  </table>
                  <p>Please arrange payment at your earliest convenience.</p>
                  <p style="color: #6b7280; font-size: 12px; margin-top: 32px;">This is an automated reminder sent by Paydar.</p>
                </body>
                </html>
                """.formatted(clientName, invoiceNum, amount, dueDate, invoiceNum, amount, dueDate);
    }
}
