package com.paydar.invoice.dto;

import com.paydar.domain.invoice.Invoice;
import com.paydar.domain.invoice.InvoiceStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/** Lightweight projection used in list views — avoids loading line items. */
public record InvoiceSummaryResponse(
        UUID id,
        String number,
        InvoiceStatus status,
        String clientName,
        LocalDate issueDate,
        LocalDate dueDate,
        BigDecimal total,
        String currency
) {
    public static InvoiceSummaryResponse from(Invoice invoice) {
        return new InvoiceSummaryResponse(
                invoice.getId(),
                invoice.getNumber(),
                invoice.getStatus(),
                invoice.getClient().getName(),
                invoice.getIssueDate(),
                invoice.getDueDate(),
                invoice.getTotal(),
                invoice.getCurrency()
        );
    }
}
