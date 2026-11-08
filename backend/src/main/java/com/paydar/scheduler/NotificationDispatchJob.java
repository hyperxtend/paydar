package com.paydar.scheduler;

import com.paydar.notification.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.quartz.Job;
import org.quartz.JobExecutionContext;
import org.springframework.stereotype.Component;

/**
 * Runs daily at 08:00 UTC (after OverdueDetectionJob).
 * Evaluates all active notification rules and dispatches any due reminders.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class NotificationDispatchJob implements Job {

    private final NotificationService notificationService;

    @Override
    public void execute(JobExecutionContext context) {
        log.info("NotificationDispatchJob started");
        try {
            notificationService.dispatchScheduledNotifications();
        } catch (Exception e) {
            log.error("NotificationDispatchJob failed: {}", e.getMessage(), e);
        }
        log.info("NotificationDispatchJob complete");
    }
}
