package com.paydar.notification.dto;

import com.paydar.domain.notification.NotificationChannel;
import com.paydar.domain.notification.NotificationRule;

import java.time.Instant;
import java.util.Set;
import java.util.UUID;

public record NotificationRuleResponse(
        UUID id,
        String name,
        int triggerDaysOffset,
        String triggerLabel,
        Set<NotificationChannel> channels,
        boolean active,
        Instant createdAt
) {
    public static NotificationRuleResponse from(NotificationRule rule) {
        return new NotificationRuleResponse(
                rule.getId(),
                rule.getName(),
                rule.getTriggerDaysOffset(),
                describeTrigger(rule.getTriggerDaysOffset()),
                rule.getChannels(),
                rule.isActive(),
                rule.getCreatedAt()
        );
    }

    private static String describeTrigger(int offset) {
        if (offset < 0)  return "%d day(s) before due date".formatted(Math.abs(offset));
        if (offset == 0) return "On the due date";
        return "%d day(s) after due date (overdue)".formatted(offset);
    }
}
