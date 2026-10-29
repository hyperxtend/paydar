package com.paydar.domain.user;

/**
 * System roles controlling access within an organisation.
 *
 * ADMIN   — full access: manage users, settings, all invoices
 * FINANCE — create/edit invoices, record payments, view reports
 * VIEWER  — read-only access to invoices and reports
 */
public enum Role {
    ADMIN,
    FINANCE,
    VIEWER
}
