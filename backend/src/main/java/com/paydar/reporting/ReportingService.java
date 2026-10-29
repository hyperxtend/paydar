package com.paydar.reporting;

import com.paydar.domain.invoice.Invoice;
import com.paydar.domain.invoice.InvoiceRepository;
import com.paydar.domain.invoice.InvoiceStatus;
import com.paydar.domain.payment.PaymentRepository;
import com.paydar.reporting.dto.AgingReport;
import com.paydar.reporting.dto.AgingReport.AgingRow;
import com.paydar.reporting.dto.DashboardMetrics;
import lombok.RequiredArgsConstructor;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVPrinter;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.io.Writer;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ReportingService {

    private final InvoiceRepository invoiceRepository;
    private final PaymentRepository paymentRepository;

    @Transactional(readOnly = true)
    public DashboardMetrics getDashboardMetrics(UUID orgId) {
        List<Invoice> invoices = invoiceRepository.findAllByOrganisationId(orgId);

        BigDecimal totalInvoiced = BigDecimal.ZERO;
        BigDecimal totalOutstanding = BigDecimal.ZERO;
        BigDecimal overdueAmount = BigDecimal.ZERO;

        long draftCount = 0, sentCount = 0, partialCount = 0, paidCount = 0, overdueCount = 0;

        for (Invoice inv : invoices) {
            if (inv.getStatus() == InvoiceStatus.VOID) continue;

            totalInvoiced = totalInvoiced.add(inv.getTotal());

            switch (inv.getStatus()) {
                case DRAFT          -> draftCount++;
                case SENT           -> { sentCount++; totalOutstanding = totalOutstanding.add(inv.getBalanceDue()); }
                case PARTIALLY_PAID -> { partialCount++; totalOutstanding = totalOutstanding.add(inv.getBalanceDue()); }
                case PAID           -> paidCount++;
                case OVERDUE        -> {
                    overdueCount++;
                    overdueAmount = overdueAmount.add(inv.getBalanceDue());
                    totalOutstanding = totalOutstanding.add(inv.getBalanceDue());
                }
            }
        }

        BigDecimal totalCollected = paymentRepository.sumAmountByOrgId(orgId).orElse(BigDecimal.ZERO);
        AgingReport aging = buildAgingReport(invoices);

        return new DashboardMetrics(
                totalInvoiced,
                totalCollected,
                totalOutstanding,
                overdueCount,
                overdueAmount,
                draftCount,
                sentCount,
                partialCount,
                paidCount,
                aging
        );
    }

    @Transactional(readOnly = true)
    public AgingReport getAgingReport(UUID orgId) {
        List<Invoice> invoices = invoiceRepository.findAllByOrganisationId(orgId);
        return buildAgingReport(invoices);
    }

    private AgingReport buildAgingReport(List<Invoice> invoices) {
        LocalDate today = LocalDate.now();

        BigDecimal current   = BigDecimal.ZERO;
        BigDecimal d1to30    = BigDecimal.ZERO;
        BigDecimal d31to60   = BigDecimal.ZERO;
        BigDecimal d61to90   = BigDecimal.ZERO;
        BigDecimal d90plus   = BigDecimal.ZERO;

        List<AgingRow> rows = new ArrayList<>();

        for (Invoice inv : invoices) {
            if (inv.getStatus() == InvoiceStatus.PAID || inv.getStatus() == InvoiceStatus.VOID) continue;
            if (inv.getBalanceDue().compareTo(BigDecimal.ZERO) <= 0) continue;

            long daysOverdue = ChronoUnit.DAYS.between(inv.getDueDate(), today);
            BigDecimal balance = inv.getBalanceDue();

            if (daysOverdue <= 0) {
                current = current.add(balance);
            } else if (daysOverdue <= 30) {
                d1to30 = d1to30.add(balance);
            } else if (daysOverdue <= 60) {
                d31to60 = d31to60.add(balance);
            } else if (daysOverdue <= 90) {
                d61to90 = d61to90.add(balance);
            } else {
                d90plus = d90plus.add(balance);
            }

            rows.add(new AgingRow(
                    inv.getId().toString(),
                    inv.getNumber(),
                    inv.getClient().getName(),
                    (int) Math.max(0, daysOverdue),
                    balance,
                    inv.getCurrency()
            ));
        }

        // Sort by daysOverdue descending (oldest first)
        rows.sort((a, b) -> Integer.compare(b.daysOverdue(), a.daysOverdue()));

        return new AgingReport(current, d1to30, d31to60, d61to90, d90plus, rows);
    }

    @Transactional(readOnly = true)
    public void exportInvoicesCsv(UUID orgId, Writer writer) throws IOException {
        List<Invoice> invoices = invoiceRepository.findAllByOrganisationId(orgId);

        String[] headers = {
                "Invoice Number", "Client", "Status", "Issue Date", "Due Date",
                "Currency", "Subtotal", "Tax", "Discount", "Total", "Amount Paid", "Balance Due"
        };

        try (CSVPrinter csv = new CSVPrinter(writer, CSVFormat.DEFAULT.builder().setHeader(headers).build())) {
            for (Invoice inv : invoices) {
                csv.printRecord(
                        inv.getNumber(),
                        inv.getClient().getName(),
                        inv.getStatus().name(),
                        inv.getIssueDate(),
                        inv.getDueDate(),
                        inv.getCurrency(),
                        inv.getSubtotal(),
                        inv.getTaxAmount(),
                        inv.getDiscountAmount(),
                        inv.getTotal(),
                        inv.getAmountPaid(),
                        inv.getBalanceDue()
                );
            }
        }
    }
}
