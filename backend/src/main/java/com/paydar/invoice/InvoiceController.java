package com.paydar.invoice;

import com.paydar.domain.invoice.InvoiceStatus;
import com.paydar.domain.user.User;
import com.paydar.invoice.dto.*;
import com.paydar.pdf.InvoicePdfService;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/v1/invoices")
@RequiredArgsConstructor
public class InvoiceController {

    private final InvoiceService     invoiceService;
    private final InvoicePdfService  invoicePdfService;

    /** GET /api/v1/invoices — list all invoices for the current user's org */
    @GetMapping
    public ResponseEntity<List<InvoiceSummaryResponse>> getAll(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(invoiceService.findAll(user));
    }

    /** GET /api/v1/invoices/{id} — get full invoice detail */
    @GetMapping("/{id}")
    public ResponseEntity<InvoiceResponse> getById(
            @PathVariable UUID id,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(invoiceService.findById(id, user));
    }

    /** POST /api/v1/invoices — create a new DRAFT invoice */
    @PostMapping
    public ResponseEntity<InvoiceResponse> create(
            @Valid @RequestBody CreateInvoiceRequest request,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.status(HttpStatus.CREATED).body(invoiceService.create(request, user));
    }

    /** PUT /api/v1/invoices/{id} — update a DRAFT invoice */
    @PutMapping("/{id}")
    public ResponseEntity<InvoiceResponse> update(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateInvoiceRequest request,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(invoiceService.update(id, request, user));
    }

    /** PATCH /api/v1/invoices/{id}/status — transition invoice status */
    @PatchMapping("/{id}/status")
    public ResponseEntity<InvoiceResponse> updateStatus(
            @PathVariable UUID id,
            @RequestParam InvoiceStatus status,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(invoiceService.updateStatus(id, status, user));
    }

    /** DELETE /api/v1/invoices/{id} — delete a DRAFT invoice */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @PathVariable UUID id,
            @AuthenticationPrincipal User user) {
        invoiceService.delete(id, user);
        return ResponseEntity.noContent().build();
    }

    /**
     * GET /api/v1/invoices/{id}/pdf
     * Streams a PDF of the invoice. Requires the caller to belong to the same org.
     */
    @GetMapping("/{id}/pdf")
    public void downloadPdf(
            @PathVariable UUID id,
            @AuthenticationPrincipal User user,
            HttpServletResponse response) throws IOException {
        var invoice = invoiceService.findInvoiceEntity(id, user);
        String filename = "invoice-" + invoice.getNumber().replaceAll("[^a-zA-Z0-9\\-]", "_") + ".pdf";
        response.setContentType("application/pdf");
        response.setHeader("Content-Disposition", "attachment; filename=\"" + filename + "\"");
        invoicePdfService.generate(invoice, response.getOutputStream());
    }
}
