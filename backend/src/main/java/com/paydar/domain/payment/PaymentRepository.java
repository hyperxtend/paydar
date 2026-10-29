package com.paydar.domain.payment;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PaymentRepository extends JpaRepository<Payment, UUID> {

    List<Payment> findByInvoiceIdOrderByPaidAtDesc(UUID invoiceId);

    @Query("SELECT p FROM Payment p WHERE p.invoice.organisation.id = :orgId ORDER BY p.paidAt DESC")
    List<Payment> findAllByOrgId(UUID orgId);

    // SUM returns null (not 0) when there are no rows; use Optional to handle that safely.
    @Query("SELECT SUM(p.amount) FROM Payment p WHERE p.invoice.organisation.id = :orgId")
    Optional<BigDecimal> sumAmountByOrgId(UUID orgId);
}
