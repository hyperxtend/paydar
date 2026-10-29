package com.paydar.reporting.dto;

import java.math.BigDecimal;

/**
 * Top-level metrics for the dashboard.
 *
 * @param totalInvoiced       sum of all non-void invoice totals
 * @param totalCollected      sum of all recorded payments
 * @param totalOutstanding    sum of balance-due on all open invoices
 * @param overdueCount        number of OVERDUE invoices
 * @param overdueAmount       total balance due on OVERDUE invoices
 * @param draftCount          invoices in DRAFT status
 * @param sentCount           invoices in SENT status
 * @param partiallyPaidCount  invoices in PARTIALLY_PAID status
 * @param paidCount           invoices in PAID status
 * @param aging               30/60/90/90+ day aging buckets
 */
public record DashboardMetrics(
        BigDecimal totalInvoiced,
        BigDecimal totalCollected,
        BigDecimal totalOutstanding,
        long       overdueCount,
        BigDecimal overdueAmount,
        long       draftCount,
        long       sentCount,
        long       partiallyPaidCount,
        long       paidCount,
        AgingReport aging
) {}
