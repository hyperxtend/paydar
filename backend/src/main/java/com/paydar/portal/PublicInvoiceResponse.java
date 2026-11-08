package com.paydar.portal;

import com.paydar.domain.invoice.Invoice;
import com.paydar.domain.invoice.InvoiceItem;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Slimmed-down invoice view for the public client portal.
 * Deliberately omits org-internal fields (share token, audit fields, etc.).
 */
public record PublicInvoiceResponse(
        UUID         id,
        String       number,
        String       status,
        LocalDate    issueDate,
        LocalDate    dueDate,
        String       currency,
        BigDecimal   subtotal,
        BigDecimal   taxAmount,
        BigDecimal   discountAmount,
        BigDecimal   total,
        BigDecimal   amountPaid,
        BigDecimal   balanceDue,
        String       notes,
        String       clientName,
        String       organisationName,
        List<Item>   items,
        // Stripe checkout URL — non-null only if a session has been created for this invoice
        String       stripeCheckoutUrl
) {

    public record Item(
            String     description,
            BigDecimal quantity,
            BigDecimal unitPrice,
            BigDecimal taxRate,
            BigDecimal amount
    ) {
        static Item from(InvoiceItem i) {
            return new Item(i.getDescription(), i.getQuantity(), i.getUnitPrice(),
                            i.getTaxRate(), i.getAmount());
        }
    }

    public static PublicInvoiceResponse from(Invoice inv) {
        return new PublicInvoiceResponse(
                inv.getId(),
                inv.getNumber(),
                inv.getStatus().name(),
                inv.getIssueDate(),
                inv.getDueDate(),
                inv.getCurrency(),
                inv.getSubtotal(),
                inv.getTaxAmount(),
                inv.getDiscountAmount(),
                inv.getTotal(),
                inv.getAmountPaid(),
                inv.getBalanceDue(),
                inv.getNotes(),
                inv.getClient().getName(),
                inv.getOrganisation().getName(),
                inv.getItems().stream().map(Item::from).toList(),
                null  // Stripe URL wired up when Stripe is configured — kept null for now
        );
    }
}
