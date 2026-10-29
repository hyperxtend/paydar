package com.paydar.pdf;

import com.lowagie.text.*;
import com.lowagie.text.pdf.*;
import com.lowagie.text.pdf.draw.LineSeparator;
import com.paydar.domain.invoice.Invoice;
import com.paydar.domain.invoice.InvoiceItem;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.OutputStream;
import java.time.format.DateTimeFormatter;

/**
 * Generates a clean, single-page PDF for an invoice using OpenPDF (LibrePDF fork).
 * Designed to be called from both the authenticated download endpoint and the
 * unauthenticated public client-portal endpoint.
 */
@Service
public class InvoicePdfService {

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd MMM yyyy");

    // Brand palette
    private static final Color BRAND    = new Color(79, 70, 229);   // indigo-600
    private static final Color DARK     = new Color(17, 24, 39);    // gray-900
    private static final Color MID      = new Color(107, 114, 128); // gray-500
    private static final Color LIGHT_BG = new Color(249, 250, 251); // gray-50
    private static final Color BORDER   = new Color(229, 231, 235); // gray-200
    private static final Color WHITE    = Color.WHITE;

    public void generate(Invoice invoice, OutputStream out) {
        Document doc = new Document(PageSize.A4, 50, 50, 60, 60);
        try {
            PdfWriter.getInstance(doc, out);
            doc.open();

            addHeader(doc, invoice);
            doc.add(Chunk.NEWLINE);
            addAddressBlock(doc, invoice);
            doc.add(Chunk.NEWLINE);
            addLineItemsTable(doc, invoice);
            doc.add(Chunk.NEWLINE);
            addTotalsTable(doc, invoice);
            if (invoice.getNotes() != null && !invoice.getNotes().isBlank()) {
                doc.add(Chunk.NEWLINE);
                addNotes(doc, invoice.getNotes());
            }
            addFooter(doc);

        } catch (Exception e) {
            throw new RuntimeException("Failed to generate invoice PDF", e);
        } finally {
            doc.close();
        }
    }

    // ── Sections ─────────────────────────────────────────────────────────────

    private void addHeader(Document doc, Invoice invoice) throws DocumentException {
        Font titleFont  = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 26, BRAND);
        Font labelFont  = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8,  MID);
        Font valueFont  = FontFactory.getFont(FontFactory.HELVETICA, 10, DARK);
        Font statusFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, WHITE);

        PdfPTable table = new PdfPTable(2);
        table.setWidthPercentage(100);
        table.setWidths(new float[]{60, 40});

        // Left: company name / "INVOICE"
        PdfPCell left = new PdfPCell();
        left.setBorder(Rectangle.NO_BORDER);
        left.addElement(new Paragraph("Paydar", titleFont));
        Paragraph sub = new Paragraph("INVOICE", FontFactory.getFont(FontFactory.HELVETICA, 11, MID));
        sub.setSpacingBefore(2);
        left.addElement(sub);
        table.addCell(left);

        // Right: invoice number, dates, status badge
        PdfPCell right = new PdfPCell();
        right.setBorder(Rectangle.NO_BORDER);
        right.setHorizontalAlignment(Element.ALIGN_RIGHT);

        right.addElement(labelledLine("Invoice #", invoice.getNumber(), labelFont, valueFont));
        right.addElement(labelledLine("Issue date", invoice.getIssueDate().format(DATE_FMT), labelFont, valueFont));
        right.addElement(labelledLine("Due date",   invoice.getDueDate().format(DATE_FMT),   labelFont, valueFont));

        // Status badge
        String statusText = invoice.getStatus().name().replace('_', ' ');
        Color badgeColor = statusBadgeColor(invoice.getStatus().name());
        PdfPTable badge = new PdfPTable(1);
        badge.setWidthPercentage(45);
        badge.setHorizontalAlignment(Element.ALIGN_RIGHT);
        PdfPCell bc = new PdfPCell(new Phrase(statusText, statusFont));
        bc.setBackgroundColor(badgeColor);
        bc.setHorizontalAlignment(Element.ALIGN_CENTER);
        bc.setPadding(4);
        bc.setBorder(Rectangle.NO_BORDER);
        badge.addCell(bc);
        Paragraph badgePara = new Paragraph();
        badgePara.setSpacingBefore(6);
        badgePara.add(new Chunk("  "));  // right-align hack via leading spaces — badge is in its own table
        right.addElement(badgePara);
        right.addElement(badge);

        table.addCell(right);
        doc.add(table);

        // Horizontal rule
        addRule(doc);
    }

    private void addAddressBlock(Document doc, Invoice invoice) throws DocumentException {
        Font labelFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8, MID);
        Font valueFont = FontFactory.getFont(FontFactory.HELVETICA, 10, DARK);
        Font boldValue = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, DARK);

        PdfPTable table = new PdfPTable(2);
        table.setWidthPercentage(100);
        table.setWidths(new float[]{50, 50});

        // Bill From
        PdfPCell from = new PdfPCell();
        from.setBorder(Rectangle.NO_BORDER);
        from.setBackgroundColor(LIGHT_BG);
        from.setPadding(12);
        from.addElement(new Paragraph("Bill From", labelFont));
        from.addElement(new Paragraph(invoice.getOrganisation().getName(), boldValue));
        table.addCell(from);

        // Bill To
        PdfPCell to = new PdfPCell();
        to.setBorder(Rectangle.NO_BORDER);
        to.setPadding(12);
        to.addElement(new Paragraph("Bill To", labelFont));
        to.addElement(new Paragraph(invoice.getClient().getName(), boldValue));
        if (invoice.getClient().getEmail() != null) {
            to.addElement(new Paragraph(invoice.getClient().getEmail(), valueFont));
        }
        if (invoice.getClient().getPhone() != null) {
            to.addElement(new Paragraph(invoice.getClient().getPhone(), valueFont));
        }
        table.addCell(to);

        doc.add(table);
    }

    private void addLineItemsTable(Document doc, Invoice invoice) throws DocumentException {
        Font headFont  = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, WHITE);
        Font bodyFont  = FontFactory.getFont(FontFactory.HELVETICA, 9, DARK);
        Font numFont   = FontFactory.getFont(FontFactory.HELVETICA, 9, DARK);

        PdfPTable table = new PdfPTable(4);
        table.setWidthPercentage(100);
        table.setWidths(new float[]{50, 15, 15, 20});
        table.setSpacingBefore(4);

        // Header row
        String[] heads = {"Description", "Qty", "Unit Price", "Amount"};
        int[] aligns   = {Element.ALIGN_LEFT, Element.ALIGN_CENTER, Element.ALIGN_RIGHT, Element.ALIGN_RIGHT};
        for (int i = 0; i < heads.length; i++) {
            PdfPCell cell = new PdfPCell(new Phrase(heads[i], headFont));
            cell.setBackgroundColor(BRAND);
            cell.setPadding(8);
            cell.setHorizontalAlignment(aligns[i]);
            cell.setBorder(Rectangle.NO_BORDER);
            table.addCell(cell);
        }

        // Data rows
        boolean stripe = false;
        for (InvoiceItem item : invoice.getItems()) {
            Color bg = stripe ? LIGHT_BG : WHITE;
            addItemRow(table, item.getDescription(), bodyFont, numFont, bg, item);
            stripe = !stripe;
        }

        doc.add(table);
    }

    private void addItemRow(PdfPTable table, String desc, Font bodyFont, Font numFont,
                            Color bg, InvoiceItem item) {
        PdfPCell d = new PdfPCell(new Phrase(desc, bodyFont));
        d.setBorder(Rectangle.BOTTOM); d.setBorderColor(BORDER);
        d.setBackgroundColor(bg); d.setPadding(8);
        table.addCell(d);

        PdfPCell q = new PdfPCell(new Phrase(item.getQuantity().toPlainString(), numFont));
        q.setBorder(Rectangle.BOTTOM); q.setBorderColor(BORDER);
        q.setBackgroundColor(bg); q.setPadding(8);
        q.setHorizontalAlignment(Element.ALIGN_CENTER);
        table.addCell(q);

        PdfPCell u = new PdfPCell(new Phrase(money(item.getUnitPrice()), numFont));
        u.setBorder(Rectangle.BOTTOM); u.setBorderColor(BORDER);
        u.setBackgroundColor(bg); u.setPadding(8);
        u.setHorizontalAlignment(Element.ALIGN_RIGHT);
        table.addCell(u);

        PdfPCell a = new PdfPCell(new Phrase(money(item.getAmount()), numFont));
        a.setBorder(Rectangle.BOTTOM); a.setBorderColor(BORDER);
        a.setBackgroundColor(bg); a.setPadding(8);
        a.setHorizontalAlignment(Element.ALIGN_RIGHT);
        table.addCell(a);
    }

    private void addTotalsTable(Document doc, Invoice invoice) throws DocumentException {
        Font labelFont = FontFactory.getFont(FontFactory.HELVETICA, 9, MID);
        Font valueFont = FontFactory.getFont(FontFactory.HELVETICA, 9, DARK);
        Font totalLbl  = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, WHITE);
        Font totalVal  = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, WHITE);

        PdfPTable outer = new PdfPTable(2);
        outer.setWidthPercentage(100);
        outer.setWidths(new float[]{55, 45});

        // Left cell — empty spacer
        PdfPCell spacer = new PdfPCell();
        spacer.setBorder(Rectangle.NO_BORDER);
        outer.addCell(spacer);

        // Right cell — totals block
        PdfPTable totals = new PdfPTable(2);
        totals.setWidthPercentage(100);

        addTotalRow(totals, "Subtotal",  money(invoice.getSubtotal()),       labelFont, valueFont, WHITE, false);
        if (invoice.getTaxAmount().signum() > 0) {
            addTotalRow(totals, "Tax",   money(invoice.getTaxAmount()),       labelFont, valueFont, WHITE, false);
        }
        if (invoice.getDiscountAmount().signum() > 0) {
            addTotalRow(totals, "Discount", "−" + money(invoice.getDiscountAmount()), labelFont, valueFont, WHITE, false);
        }
        if (invoice.getAmountPaid().signum() > 0) {
            addTotalRow(totals, "Amount Paid", "−" + money(invoice.getAmountPaid()), labelFont, valueFont, WHITE, false);
        }

        // Total due — highlighted
        addTotalRow(totals,
                invoice.getBalanceDue().signum() <= 0 ? "PAID IN FULL" : "BALANCE DUE",
                money(invoice.getBalanceDue()),
                totalLbl, totalVal, BRAND, true);

        PdfPCell right = new PdfPCell(totals);
        right.setBorder(Rectangle.NO_BORDER);
        outer.addCell(right);

        doc.add(outer);
    }

    private void addTotalRow(PdfPTable table, String label, String value,
                              Font lf, Font vf, Color bg, boolean highlighted) {
        PdfPCell lc = new PdfPCell(new Phrase(label, lf));
        lc.setBackgroundColor(bg);
        lc.setBorder(highlighted ? Rectangle.NO_BORDER : Rectangle.TOP);
        lc.setBorderColor(BORDER);
        lc.setPadding(highlighted ? 10 : 6);
        lc.setHorizontalAlignment(Element.ALIGN_LEFT);
        table.addCell(lc);

        PdfPCell vc = new PdfPCell(new Phrase(value, vf));
        vc.setBackgroundColor(bg);
        vc.setBorder(highlighted ? Rectangle.NO_BORDER : Rectangle.TOP);
        vc.setBorderColor(BORDER);
        vc.setPadding(highlighted ? 10 : 6);
        vc.setHorizontalAlignment(Element.ALIGN_RIGHT);
        table.addCell(vc);
    }

    private void addNotes(Document doc, String notes) throws DocumentException {
        Font labelFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8, MID);
        Font bodyFont  = FontFactory.getFont(FontFactory.HELVETICA, 9, DARK);

        PdfPTable table = new PdfPTable(1);
        table.setWidthPercentage(100);
        PdfPCell cell = new PdfPCell();
        cell.setBorder(Rectangle.NO_BORDER);
        cell.setBackgroundColor(LIGHT_BG);
        cell.setPadding(12);
        cell.addElement(new Paragraph("Notes", labelFont));
        cell.addElement(new Paragraph(notes, bodyFont));
        table.addCell(cell);
        doc.add(table);
    }

    private void addFooter(Document doc) throws DocumentException {
        Font footerFont = FontFactory.getFont(FontFactory.HELVETICA, 8, MID);
        addRule(doc);
        Paragraph footer = new Paragraph("Generated by Paydar", footerFont);
        footer.setAlignment(Element.ALIGN_CENTER);
        doc.add(footer);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private void addRule(Document doc) throws DocumentException {
        LineSeparator line = new LineSeparator(1f, 100f, BORDER, Element.ALIGN_CENTER, -5);
        doc.add(new Chunk(line));
        doc.add(Chunk.NEWLINE);
    }

    private Paragraph labelledLine(String label, String value, Font lf, Font vf) {
        Paragraph p = new Paragraph();
        p.add(new Chunk(label + " ", lf));
        p.add(new Chunk(value, vf));
        p.setAlignment(Element.ALIGN_RIGHT);
        p.setSpacingBefore(3);
        return p;
    }

    private String money(java.math.BigDecimal amount) {
        if (amount == null) return "0.00";
        return String.format("%.2f", amount);
    }

    private Color statusBadgeColor(String status) {
        return switch (status) {
            case "PAID"                      -> new Color(22, 163, 74);   // green-600
            case "OVERDUE"                   -> new Color(220, 38, 38);   // red-600
            case "PARTIALLY_PAID"            -> new Color(217, 119, 6);   // amber-600
            case "SENT"                      -> new Color(37, 99, 235);   // blue-600
            case "VOID"                      -> new Color(107, 114, 128); // gray-500
            default /* DRAFT */              -> new Color(107, 114, 128);
        };
    }
}
