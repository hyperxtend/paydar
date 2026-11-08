package com.paydar.invoice.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Only DRAFT invoices may be fully edited.
 * All fields are optional — supply only what you want to change.
 */
public record UpdateInvoiceRequest(
        UUID clientId,
        LocalDate issueDate,
        LocalDate dueDate,
        String currency,
        BigDecimal discountAmount,
        String notes,
        @Valid List<InvoiceItemRequest> items
) {}
