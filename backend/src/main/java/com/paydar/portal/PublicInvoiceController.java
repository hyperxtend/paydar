package com.paydar.portal;

import com.paydar.pdf.InvoicePdfService;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.UUID;

/**
 * Unauthenticated client-portal endpoints.
 * Access is gated by the per-invoice share token (a UUID) which is unguessable.
 *
 * Endpoints:
 *   GET /api/v1/public/invoices/{token}        → invoice summary JSON
 *   GET /api/v1/public/invoices/{token}/pdf    → PDF download stream
 *
 * These paths are explicitly whitelisted in SecurityConfig.
 */
@RestController
@RequestMapping("/v1/public/invoices")
@RequiredArgsConstructor
public class PublicInvoiceController {

    private final PublicInvoiceService  publicInvoiceService;
    private final InvoicePdfService     invoicePdfService;

    /** Returns the public invoice view — enough for a client to review and pay. */
    @GetMapping("/{token}")
    public ResponseEntity<PublicInvoiceResponse> getByToken(@PathVariable UUID token) {
        return ResponseEntity.ok(publicInvoiceService.findByToken(token));
    }

    /** Streams the PDF. No auth required — token acts as the access credential. */
    @GetMapping("/{token}/pdf")
    public void downloadPdf(@PathVariable UUID token, HttpServletResponse response) throws IOException {
        var invoice = publicInvoiceService.findInvoiceByToken(token);
        String filename = "invoice-" + invoice.getNumber().replaceAll("[^a-zA-Z0-9\\-]", "_") + ".pdf";
        response.setContentType("application/pdf");
        response.setHeader("Content-Disposition", "attachment; filename=\"" + filename + "\"");
        invoicePdfService.generate(invoice, response.getOutputStream());
    }
}
