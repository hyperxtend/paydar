package com.paydar.domain.notification;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface NotificationRuleRepository extends JpaRepository<NotificationRule, UUID> {

    List<NotificationRule> findAllByOrganisationIdAndActiveTrue(UUID organisationId);

    List<NotificationRule> findAllByOrganisationId(UUID organisationId);

    Optional<NotificationRule> findByIdAndOrganisationId(UUID id, UUID organisationId);
}
