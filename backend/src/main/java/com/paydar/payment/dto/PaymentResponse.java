package com.paydar.payment.dto;

import com.paydar.domain.payment.Payment;
import com.paydar.domain.payment.PaymentMethod;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record PaymentResponse(
        UUID id,
        UUID invoiceId,
        String invoiceNumber,
        BigDecimal amount,
        String currency,
        PaymentMethod paymentMethod,
        String reference,
        String notes,
        Instant paidAt,
        String recordedBy,
        Instant createdAt
) {
    public static PaymentResponse from(Payment p) {
        String recorder = p.getRecordedBy() != null
                ? p.getRecordedBy().getFirstName() + " " + p.getRecordedBy().getLastName()
                : null;
        return new PaymentResponse(
                p.getId(),
                p.getInvoice().getId(),
                p.getInvoice().getNumber(),
                p.getAmount(),
                p.getCurrency(),
                p.getPaymentMethod(),
                p.getReference(),
                p.getNotes(),
                p.getPaidAt(),
                recorder,
                p.getCreatedAt()
        );
    }
}
