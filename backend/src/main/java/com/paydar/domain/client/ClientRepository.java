package com.paydar.domain.client;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ClientRepository extends JpaRepository<Client, UUID> {

    List<Client> findAllByOrganisationIdOrderByNameAsc(UUID organisationId);

    Optional<Client> findByIdAndOrganisationId(UUID id, UUID organisationId);

    boolean existsByIdAndOrganisationId(UUID id, UUID organisationId);
}
