package com.paydar.notification.dto;

import com.paydar.domain.notification.NotificationChannel;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.Set;

public record NotificationRuleRequest(

        @NotBlank(message = "Rule name is required")
        String name,

        @NotNull(message = "Trigger days offset is required")
        Integer triggerDaysOffset,

        @NotEmpty(message = "At least one channel is required")
        Set<NotificationChannel> channels,

        Boolean active
) {}
