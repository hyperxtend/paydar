package com.paydar.notification;

import com.paydar.domain.user.User;
import com.paydar.notification.dto.NotificationRuleRequest;
import com.paydar.notification.dto.NotificationRuleResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/v1/notification-rules")
@RequiredArgsConstructor
public class NotificationRuleController {

    private final NotificationRuleService ruleService;

    @GetMapping
    public ResponseEntity<List<NotificationRuleResponse>> getAll(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ruleService.findAll(user));
    }

    @PostMapping
    public ResponseEntity<NotificationRuleResponse> create(
            @Valid @RequestBody NotificationRuleRequest request,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ruleService.create(request, user));
    }

    @PutMapping("/{id}")
    public ResponseEntity<NotificationRuleResponse> update(
            @PathVariable UUID id,
            @Valid @RequestBody NotificationRuleRequest request,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ruleService.update(id, request, user));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @PathVariable UUID id,
            @AuthenticationPrincipal User user) {
        ruleService.delete(id, user);
        return ResponseEntity.noContent().build();
    }
}
