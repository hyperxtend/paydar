package com.paydar.invoice.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record CreateInvoiceRequest(

        @NotNull(message = "Client ID is required")
        UUID clientId,

        @NotNull(message = "Issue date is required")
        LocalDate issueDate,

        @NotNull(message = "Due date is required")
        LocalDate dueDate,

        String currency,

        /** Optional flat discount applied after subtotal + tax. */
        BigDecimal discountAmount,

        String notes,

        @NotEmpty(message = "At least one line item is required")
        @Valid
        List<InvoiceItemRequest> items
) {}
