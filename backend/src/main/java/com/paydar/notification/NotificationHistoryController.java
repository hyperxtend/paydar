package com.paydar.notification;

import com.paydar.domain.notification.NotificationChannel;
import com.paydar.domain.user.User;
import com.paydar.notification.dto.NotificationResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/v1/notifications")
@RequiredArgsConstructor
public class NotificationHistoryController {

    private final NotificationService notificationService;

    /** GET /api/v1/notifications — full notification history for the org */
    @GetMapping
    public ResponseEntity<List<NotificationResponse>> getAll(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(
                notificationService.findAllByOrg(user.getOrganisation().getId())
                        .stream().map(NotificationResponse::from).toList()
        );
    }

    /** GET /api/v1/notifications/invoice/{invoiceId} — history for a specific invoice */
    @GetMapping("/invoice/{invoiceId}")
    public ResponseEntity<List<NotificationResponse>> getByInvoice(
            @PathVariable UUID invoiceId,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(
                notificationService.findByInvoice(invoiceId)
                        .stream().map(NotificationResponse::from).toList()
        );
    }

    /** POST /api/v1/notifications/invoice/{invoiceId}/ping — manual trigger */
    @PostMapping("/invoice/{invoiceId}/ping")
    public ResponseEntity<Void> manualPing(
            @PathVariable UUID invoiceId,
            @RequestParam NotificationChannel channel,
            @AuthenticationPrincipal User user) {
        notificationService.sendManualNotification(invoiceId, user.getOrganisation().getId(), channel);
        return ResponseEntity.accepted().build();
    }
}
