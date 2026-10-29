package com.paydar.domain.invoice;

import java.util.Map;
import java.util.Set;

/**
 * Invoice lifecycle states.
 *
 * Allowed transitions:
 *   DRAFT          → SENT, VOID
 *   SENT           → PARTIALLY_PAID, PAID, OVERDUE, VOID
 *   PARTIALLY_PAID → PAID, OVERDUE, VOID
 *   OVERDUE        → PARTIALLY_PAID, PAID, VOID
 *   PAID           → (terminal)
 *   VOID           → (terminal)
 */
public enum InvoiceStatus {

    DRAFT,
    SENT,
    PARTIALLY_PAID,
    PAID,
    OVERDUE,
    VOID;

    private static final Map<InvoiceStatus, Set<InvoiceStatus>> ALLOWED_TRANSITIONS = Map.of(
            DRAFT,          Set.of(SENT, VOID),
            SENT,           Set.of(PARTIALLY_PAID, PAID, OVERDUE, VOID),
            PARTIALLY_PAID, Set.of(PAID, OVERDUE, VOID),
            OVERDUE,        Set.of(PARTIALLY_PAID, PAID, VOID),
            PAID,           Set.of(),
            VOID,           Set.of()
    );

    public boolean canTransitionTo(InvoiceStatus next) {
        return ALLOWED_TRANSITIONS.getOrDefault(this, Set.of()).contains(next);
    }
}
