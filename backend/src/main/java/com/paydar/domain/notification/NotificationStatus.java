package com.paydar.domain.notification;

public enum NotificationStatus {
    PENDING,
    SENT,
    FAILED,
    SKIPPED   // e.g. recipient missing phone number for SMS
}
