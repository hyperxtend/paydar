package com.paydar.domain.invoice;

import com.paydar.domain.client.Client;
import com.paydar.domain.organisation.Organisation;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "invoices")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Invoice {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organisation_id", nullable = false)
    private Organisation organisation;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "client_id", nullable = false)
    private Client client;

    @Column(nullable = false)
    private String number;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private InvoiceStatus status = InvoiceStatus.DRAFT;

    @Column(name = "issue_date", nullable = false)
    private LocalDate issueDate;

    @Column(name = "due_date", nullable = false)
    private LocalDate dueDate;

    @Column(nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal subtotal = BigDecimal.ZERO;

    @Column(name = "tax_amount", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal taxAmount = BigDecimal.ZERO;

    @Column(name = "discount_amount", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal discountAmount = BigDecimal.ZERO;

    @Column(nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal total = BigDecimal.ZERO;

    @Column(nullable = false)
    @Builder.Default
    private String currency = "GBP";

    private String notes;

    @Column(name = "amount_paid", nullable = false, precision = 19, scale = 4)
    @Builder.Default
    private BigDecimal amountPaid = BigDecimal.ZERO;

    @Column(name = "stripe_payment_intent_id")
    private String stripePaymentIntentId;

    @Column(name = "stripe_checkout_session_id")
    private String stripeCheckoutSessionId;

    /** Unguessable token for the public client-portal URL — generated on row insert. */
    @Column(name = "share_token", nullable = false, updatable = false, columnDefinition = "uuid")
    @Builder.Default
    private UUID shareToken = UUID.randomUUID();

    @OneToMany(mappedBy = "invoice", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder ASC")
    @Builder.Default
    private List<InvoiceItem> items = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

    // ── Helpers ────────────────────────────────────────────────────────────

    public void transitionTo(InvoiceStatus next) {
        if (!status.canTransitionTo(next)) {
            throw new IllegalStateException(
                    "Cannot transition invoice from %s to %s".formatted(status, next));
        }
        this.status = next;
    }

    /**
     * Apply a payment amount and auto-transition status.
     * SENT / OVERDUE → PARTIALLY_PAID or PAID depending on balance.
     */
    public void applyPayment(BigDecimal amount) {
        this.amountPaid = this.amountPaid.add(amount);
        BigDecimal balance = this.total.subtract(this.amountPaid);
        if (balance.compareTo(BigDecimal.ZERO) <= 0) {
            if (status.canTransitionTo(InvoiceStatus.PAID)) {
                this.status = InvoiceStatus.PAID;
            }
        } else {
            if (status.canTransitionTo(InvoiceStatus.PARTIALLY_PAID)) {
                this.status = InvoiceStatus.PARTIALLY_PAID;
            }
        }
    }

    public BigDecimal getBalanceDue() {
        return total.subtract(amountPaid).max(BigDecimal.ZERO);
    }
}
