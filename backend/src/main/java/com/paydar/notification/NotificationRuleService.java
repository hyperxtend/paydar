package com.paydar.notification;

import com.paydar.domain.notification.NotificationRule;
import com.paydar.domain.notification.NotificationRuleRepository;
import com.paydar.domain.user.User;
import com.paydar.notification.dto.NotificationRuleRequest;
import com.paydar.notification.dto.NotificationRuleResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class NotificationRuleService {

    private final NotificationRuleRepository ruleRepository;

    public List<NotificationRuleResponse> findAll(User currentUser) {
        return ruleRepository
                .findAllByOrganisationId(currentUser.getOrganisation().getId())
                .stream()
                .map(NotificationRuleResponse::from)
                .toList();
    }

    @Transactional
    public NotificationRuleResponse create(NotificationRuleRequest request, User currentUser) {
        NotificationRule rule = NotificationRule.builder()
                .organisation(currentUser.getOrganisation())
                .name(request.name())
                .triggerDaysOffset(request.triggerDaysOffset())
                .channels(request.channels())
                .active(request.active() != null ? request.active() : true)
                .build();
        return NotificationRuleResponse.from(ruleRepository.save(rule));
    }

    @Transactional
    public NotificationRuleResponse update(UUID id, NotificationRuleRequest request, User currentUser) {
        NotificationRule rule = getOwned(id, currentUser);
        rule.setName(request.name());
        rule.setTriggerDaysOffset(request.triggerDaysOffset());
        rule.getChannels().clear();
        rule.getChannels().addAll(request.channels());
        if (request.active() != null) rule.setActive(request.active());
        return NotificationRuleResponse.from(ruleRepository.save(rule));
    }

    @Transactional
    public void delete(UUID id, User currentUser) {
        ruleRepository.delete(getOwned(id, currentUser));
    }

    private NotificationRule getOwned(UUID id, User currentUser) {
        return ruleRepository
                .findByIdAndOrganisationId(id, currentUser.getOrganisation().getId())
                .orElseThrow(() -> new IllegalArgumentException("Notification rule not found: " + id));
    }
}
