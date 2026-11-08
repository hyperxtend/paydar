package com.paydar.invoice.dto;

import com.paydar.client.dto.ClientResponse;
import com.paydar.domain.invoice.Invoice;
import com.paydar.domain.invoice.InvoiceStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record InvoiceResponse(
        UUID id,
        String number,
        InvoiceStatus status,
        ClientResponse client,
        LocalDate issueDate,
        LocalDate dueDate,
        BigDecimal subtotal,
        BigDecimal taxAmount,
        BigDecimal discountAmount,
        BigDecimal total,
        BigDecimal amountPaid,
        BigDecimal balanceDue,
        String currency,
        String notes,
        List<InvoiceItemResponse> items,
        Instant createdAt,
        Instant updatedAt,
        UUID shareToken
) {
    public static InvoiceResponse from(Invoice invoice) {
        return new InvoiceResponse(
                invoice.getId(),
                invoice.getNumber(),
                invoice.getStatus(),
                ClientResponse.from(invoice.getClient()),
                invoice.getIssueDate(),
                invoice.getDueDate(),
                invoice.getSubtotal(),
                invoice.getTaxAmount(),
                invoice.getDiscountAmount(),
                invoice.getTotal(),
                invoice.getAmountPaid(),
                invoice.getBalanceDue(),
                invoice.getCurrency(),
                invoice.getNotes(),
                invoice.getItems().stream().map(InvoiceItemResponse::from).toList(),
                invoice.getCreatedAt(),
                invoice.getUpdatedAt(),
                invoice.getShareToken()
        );
    }
}
