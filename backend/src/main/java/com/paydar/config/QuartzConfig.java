package com.paydar.config;

import com.paydar.scheduler.NotificationDispatchJob;
import com.paydar.scheduler.OverdueDetectionJob;
import org.quartz.*;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class QuartzConfig {

    // ── Overdue detection — nightly 00:05 UTC ─────────────────────────────

    @Bean
    public JobDetail overdueDetectionJobDetail() {
        return JobBuilder.newJob(OverdueDetectionJob.class)
                .withIdentity("overdueDetectionJob")
                .storeDurably()
                .build();
    }

    @Bean
    public Trigger overdueDetectionTrigger(JobDetail overdueDetectionJobDetail) {
        return TriggerBuilder.newTrigger()
                .forJob(overdueDetectionJobDetail)
                .withIdentity("overdueDetectionTrigger")
                .withSchedule(CronScheduleBuilder.cronSchedule("0 5 0 * * ?"))  // 00:05 UTC daily
                .build();
    }

    // ── Notification dispatch — 08:00 UTC ─────────────────────────────────

    @Bean
    public JobDetail notificationDispatchJobDetail() {
        return JobBuilder.newJob(NotificationDispatchJob.class)
                .withIdentity("notificationDispatchJob")
                .storeDurably()
                .build();
    }

    @Bean
    public Trigger notificationDispatchTrigger(JobDetail notificationDispatchJobDetail) {
        return TriggerBuilder.newTrigger()
                .forJob(notificationDispatchJobDetail)
                .withIdentity("notificationDispatchTrigger")
                .withSchedule(CronScheduleBuilder.cronSchedule("0 0 8 * * ?"))  // 08:00 UTC daily
                .build();
    }
}
