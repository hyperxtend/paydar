package com.paydar.config;

import com.twilio.Twilio;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.util.StringUtils;

@Configuration
@Slf4j
public class TwilioConfig {

    @Value("${app.twilio.account-sid:}")
    private String accountSid;

    @Value("${app.twilio.auth-token:}")
    private String authToken;

    @PostConstruct
    public void init() {
        if (StringUtils.hasText(accountSid) && StringUtils.hasText(authToken)) {
            Twilio.init(accountSid, authToken);
            log.info("Twilio initialised successfully");
        } else {
            log.warn("Twilio credentials not configured — SMS and WhatsApp notifications are disabled");
        }
    }
}
