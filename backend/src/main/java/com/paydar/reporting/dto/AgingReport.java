package com.paydar.reporting.dto;

import java.math.BigDecimal;
import java.util.List;

/**
 * Accounts-receivable aging breakdown.
 * Buckets: current (not yet overdue), 1–30 days, 31–60 days, 61–90 days, 90+ days.
 */
public record AgingReport(
        BigDecimal      current,
        BigDecimal      days1to30,
        BigDecimal      days31to60,
        BigDecimal      days61to90,
        BigDecimal      days90plus,
        List<AgingRow>  rows
) {
    public record AgingRow(
            String     invoiceId,
            String     invoiceNumber,
            String     clientName,
            int        daysOverdue,
            BigDecimal balanceDue,
            String     currency
    ) {}
}
