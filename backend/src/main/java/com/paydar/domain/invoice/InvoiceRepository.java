package com.paydar.domain.invoice;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, UUID> {

    List<Invoice> findAllByOrganisationIdOrderByCreatedAtDesc(UUID organisationId);

    @Query("SELECT i FROM Invoice i JOIN FETCH i.client WHERE i.organisation.id = :orgId")
    List<Invoice> findAllByOrganisationId(UUID orgId);

    Optional<Invoice> findByIdAndOrganisationId(UUID id, UUID organisationId);

    long countByOrganisationId(UUID organisationId);

    @Query("SELECT COUNT(i) FROM Invoice i WHERE i.organisation.id = :orgId AND i.status = :status")
    long countByOrganisationIdAndStatus(UUID orgId, InvoiceStatus status);

    /** Public portal lookup — JOIN FETCH client + items so the PDF renderer never lazy-loads. */
    @Query("SELECT i FROM Invoice i JOIN FETCH i.client JOIN FETCH i.items WHERE i.shareToken = :token")
    Optional<Invoice> findByShareToken(UUID token);
}
