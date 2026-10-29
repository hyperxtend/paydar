package com.paydar.notification.channel;

import com.paydar.domain.notification.Notification;
import com.paydar.domain.notification.NotificationChannel;

/**
 * Strategy interface — one implementation per delivery channel.
 */
public interface NotificationSender {

    NotificationChannel channel();

    /**
     * Attempt to send the notification.
     * Implementations must NOT throw — catch exceptions internally and
     * update notification status to FAILED with the error message.
     */
    void send(Notification notification);
}
