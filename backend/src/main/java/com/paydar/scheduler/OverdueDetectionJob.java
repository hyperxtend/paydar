package com.paydar.scheduler;

import com.paydar.notification.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.quartz.Job;
import org.quartz.JobExecutionContext;
import org.springframework.stereotype.Component;

/**
 * Runs nightly at 00:05 UTC.
 * Finds all SENT/PARTIALLY_PAID invoices past their due date and marks them OVERDUE.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class OverdueDetectionJob implements Job {

    private final NotificationService notificationService;

    @Override
    public void execute(JobExecutionContext context) {
        log.info("OverdueDetectionJob started");
        try {
            notificationService.detectAndMarkOverdue();
        } catch (Exception e) {
            log.error("OverdueDetectionJob failed: {}", e.getMessage(), e);
        }
        log.info("OverdueDetectionJob complete");
    }
}
