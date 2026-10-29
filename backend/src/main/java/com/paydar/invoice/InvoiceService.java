package com.paydar.invoice;

import com.paydar.domain.client.Client;
import com.paydar.domain.client.ClientRepository;
import com.paydar.domain.invoice.*;
import com.paydar.domain.user.User;
import com.paydar.invoice.dto.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class InvoiceService {

    private final InvoiceRepository invoiceRepository;
    private final ClientRepository clientRepository;

    // ── Queries ────────────────────────────────────────────────────────────

    public List<InvoiceSummaryResponse> findAll(User currentUser) {
        return invoiceRepository
                .findAllByOrganisationIdOrderByCreatedAtDesc(currentUser.getOrganisation().getId())
                .stream()
                .map(InvoiceSummaryResponse::from)
                .toList();
    }

    public InvoiceResponse findById(UUID id, User currentUser) {
        return InvoiceResponse.from(getOwnedInvoice(id, currentUser));
    }

    /** Returns the raw entity — used by the PDF endpoint which needs items loaded. */
    @Transactional(readOnly = true)
    public Invoice findInvoiceEntity(UUID id, User currentUser) {
        return getOwnedInvoice(id, currentUser);
    }

    // ── Create ─────────────────────────────────────────────────────────────

    @Transactional
    public InvoiceResponse create(CreateInvoiceRequest request, User currentUser) {
        Client client = getOwnedClient(request.clientId(), currentUser);

        String number = generateInvoiceNumber(currentUser.getOrganisation().getId());

        Invoice invoice = Invoice.builder()
                .organisation(currentUser.getOrganisation())
                .client(client)
                .number(number)
                .issueDate(request.issueDate())
                .dueDate(request.dueDate())
                .currency(request.currency() != null ? request.currency() : "GBP")
                .discountAmount(nvl(request.discountAmount()))
                .notes(request.notes())
                .build();

        List<InvoiceItem> items = buildItems(request.items(), invoice);
        invoice.getItems().addAll(items);
        recalculateTotals(invoice);

        return InvoiceResponse.from(invoiceRepository.save(invoice));
    }

    // ── Update ─────────────────────────────────────────────────────────────

    @Transactional
    public InvoiceResponse update(UUID id, UpdateInvoiceRequest request, User currentUser) {
        Invoice invoice = getOwnedInvoice(id, currentUser);

        if (invoice.getStatus() != InvoiceStatus.DRAFT) {
            throw new IllegalStateException("Only DRAFT invoices can be edited");
        }

        if (request.clientId() != null) {
            invoice.setClient(getOwnedClient(request.clientId(), currentUser));
        }
        if (request.issueDate() != null)    invoice.setIssueDate(request.issueDate());
        if (request.dueDate() != null)      invoice.setDueDate(request.dueDate());
        if (request.currency() != null)     invoice.setCurrency(request.currency());
        if (request.discountAmount() != null) invoice.setDiscountAmount(request.discountAmount());
        if (request.notes() != null)        invoice.setNotes(request.notes());

        if (request.items() != null && !request.items().isEmpty()) {
            invoice.getItems().clear();
            invoice.getItems().addAll(buildItems(request.items(), invoice));
        }

        recalculateTotals(invoice);
        return InvoiceResponse.from(invoiceRepository.save(invoice));
    }

    // ── Status transition ──────────────────────────────────────────────────

    @Transactional
    public InvoiceResponse updateStatus(UUID id, InvoiceStatus newStatus, User currentUser) {
        Invoice invoice = getOwnedInvoice(id, currentUser);
        invoice.transitionTo(newStatus);
        return InvoiceResponse.from(invoiceRepository.save(invoice));
    }

    // ── Delete ─────────────────────────────────────────────────────────────

    @Transactional
    public void delete(UUID id, User currentUser) {
        Invoice invoice = getOwnedInvoice(id, currentUser);
        if (invoice.getStatus() != InvoiceStatus.DRAFT) {
            throw new IllegalStateException("Only DRAFT invoices can be deleted");
        }
        invoiceRepository.delete(invoice);
    }

    // ── Helpers ────────────────────────────────────────────────────────────

    private List<InvoiceItem> buildItems(List<InvoiceItemRequest> requests, Invoice invoice) {
        List<InvoiceItem> items = new ArrayList<>();
        for (int i = 0; i < requests.size(); i++) {
            InvoiceItemRequest req = requests.get(i);
            BigDecimal taxRate = nvl(req.taxRate());
            BigDecimal amount = req.quantity().multiply(req.unitPrice()).setScale(2, RoundingMode.HALF_UP);
            items.add(InvoiceItem.builder()
                    .invoice(invoice)
                    .description(req.description())
                    .quantity(req.quantity())
                    .unitPrice(req.unitPrice())
                    .taxRate(taxRate)
                    .amount(amount)
                    .sortOrder(i)
                    .build());
        }
        return items;
    }

    private void recalculateTotals(Invoice invoice) {
        BigDecimal subtotal = BigDecimal.ZERO;
        BigDecimal taxAmount = BigDecimal.ZERO;

        for (InvoiceItem item : invoice.getItems()) {
            subtotal = subtotal.add(item.getAmount());
            BigDecimal itemTax = item.getAmount()
                    .multiply(item.getTaxRate())
                    .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
            taxAmount = taxAmount.add(itemTax);
        }

        invoice.setSubtotal(subtotal);
        invoice.setTaxAmount(taxAmount);
        invoice.setTotal(subtotal.add(taxAmount).subtract(nvl(invoice.getDiscountAmount())));
    }

    private String generateInvoiceNumber(UUID orgId) {
        long count = invoiceRepository.countByOrganisationId(orgId);
        return "INV-%04d".formatted(count + 1);
    }

    private Invoice getOwnedInvoice(UUID id, User currentUser) {
        return invoiceRepository
                .findByIdAndOrganisationId(id, currentUser.getOrganisation().getId())
                .orElseThrow(() -> new IllegalArgumentException("Invoice not found: " + id));
    }

    private Client getOwnedClient(UUID clientId, User currentUser) {
        return clientRepository
                .findByIdAndOrganisationId(clientId, currentUser.getOrganisation().getId())
                .orElseThrow(() -> new IllegalArgumentException("Client not found: " + clientId));
    }

    private BigDecimal nvl(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }
}
