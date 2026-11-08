package com.paydar.payment;

import com.paydar.domain.invoice.Invoice;
import com.paydar.domain.invoice.InvoiceRepository;
import com.paydar.domain.invoice.InvoiceStatus;
import com.paydar.domain.payment.Payment;
import com.paydar.domain.payment.PaymentMethod;
import com.paydar.domain.payment.PaymentRepository;
import com.paydar.domain.user.User;
import com.paydar.payment.dto.PaymentResponse;
import com.paydar.payment.dto.RecordPaymentRequest;
import com.paydar.payment.dto.StripeCheckoutResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final InvoiceRepository invoiceRepository;

    @Value("${app.stripe.secret-key:}")
    private String stripeSecretKey;

    @Value("${app.base-url:http://localhost:5173}")
    private String baseUrl;

    // ── Manual payment recording ───────────────────────────────────────────

    @Transactional
    public PaymentResponse record(UUID invoiceId, UUID orgId, RecordPaymentRequest req, User actor) {
        Invoice invoice = getOwnedInvoice(invoiceId, orgId);
        validatePayable(invoice);

        Payment payment = Payment.builder()
                .invoice(invoice)
                .amount(req.amount())
                .currency(invoice.getCurrency())
                .paymentMethod(req.paymentMethod())
                .reference(req.reference())
                .notes(req.notes())
                .paidAt(req.paidAt() != null ? req.paidAt() : Instant.now())
                .recordedBy(actor)
                .build();

        invoice.applyPayment(req.amount());
        invoiceRepository.save(invoice);
        return PaymentResponse.from(paymentRepository.save(payment));
    }

    @Transactional(readOnly = true)
    public List<PaymentResponse> findByInvoice(UUID invoiceId) {
        return paymentRepository.findByInvoiceIdOrderByPaidAtDesc(invoiceId)
                .stream().map(PaymentResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public List<PaymentResponse> findAllByOrg(UUID orgId) {
        return paymentRepository.findAllByOrgId(orgId)
                .stream().map(PaymentResponse::from).toList();
    }

    // ── Stripe checkout ────────────────────────────────────────────────────

    @Transactional
    public StripeCheckoutResponse createStripeCheckout(UUID invoiceId, UUID orgId) {
        Invoice invoice = getOwnedInvoice(invoiceId, orgId);
        validatePayable(invoice);

        if (stripeSecretKey == null || stripeSecretKey.isBlank()) {
            throw new IllegalStateException("Stripe is not configured. Set app.stripe.secret-key.");
        }

        try {
            com.stripe.Stripe.apiKey = stripeSecretKey;

            long amountInPence = invoice.getBalanceDue()
                    .multiply(BigDecimal.valueOf(100))
                    .longValue();

            var params = com.stripe.param.checkout.SessionCreateParams.builder()
                    .setMode(com.stripe.param.checkout.SessionCreateParams.Mode.PAYMENT)
                    .addLineItem(
                            com.stripe.param.checkout.SessionCreateParams.LineItem.builder()
                                    .setQuantity(1L)
                                    .setPriceData(
                                            com.stripe.param.checkout.SessionCreateParams.LineItem.PriceData.builder()
                                                    .setCurrency(invoice.getCurrency().toLowerCase())
                                                    .setUnitAmount(amountInPence)
                                                    .setProductData(
                                                            com.stripe.param.checkout.SessionCreateParams.LineItem.PriceData.ProductData.builder()
                                                                    .setName("Invoice " + invoice.getNumber())
                                                                    .setDescription("Payment to " + invoice.getOrganisation().getName())
                                                                    .build()
                                                    )
                                                    .build()
                                    )
                                    .build()
                    )
                    .setSuccessUrl(baseUrl + "/invoices/" + invoiceId + "?payment=success")
                    .setCancelUrl(baseUrl + "/invoices/" + invoiceId + "?payment=cancelled")
                    .putMetadata("invoice_id", invoiceId.toString())
                    .build();

            var session = com.stripe.model.checkout.Session.create(params);
            invoice.setStripeCheckoutSessionId(session.getId());
            invoiceRepository.save(invoice);

            return new StripeCheckoutResponse(session.getUrl());

        } catch (com.stripe.exception.StripeException e) {
            log.error("Stripe checkout creation failed for invoice {}: {}", invoiceId, e.getMessage());
            throw new RuntimeException("Failed to create Stripe checkout session", e);
        }
    }

    // ── Stripe webhook ─────────────────────────────────────────────────────

    @Transactional
    public void handleStripeWebhook(String payload, String sigHeader, String webhookSecret) {
        com.stripe.model.Event event;
        try {
            event = com.stripe.net.Webhook.constructEvent(payload, sigHeader, webhookSecret);
        } catch (Exception e) {
            log.warn("Stripe webhook signature verification failed: {}", e.getMessage());
            throw new IllegalArgumentException("Invalid Stripe webhook signature");
        }

        if (!"checkout.session.completed".equals(event.getType())) return;

        var dataObjectDeserializer = event.getDataObjectDeserializer();
        if (dataObjectDeserializer.getObject().isEmpty()) return;

        var session = (com.stripe.model.checkout.Session) dataObjectDeserializer.getObject().get();
        String invoiceIdStr = session.getMetadata().get("invoice_id");
        if (invoiceIdStr == null) return;

        UUID invoiceId = UUID.fromString(invoiceIdStr);
        invoiceRepository.findById(invoiceId).ifPresent(invoice -> {
            BigDecimal amount = BigDecimal.valueOf(session.getAmountTotal())
                    .divide(BigDecimal.valueOf(100));

            Payment payment = Payment.builder()
                    .invoice(invoice)
                    .amount(amount)
                    .currency(invoice.getCurrency())
                    .paymentMethod(PaymentMethod.STRIPE)
                    .reference("Stripe session: " + session.getId())
                    .stripePaymentIntentId(session.getPaymentIntent())
                    .paidAt(Instant.now())
                    .build();

            invoice.applyPayment(amount);
            invoice.setStripePaymentIntentId(session.getPaymentIntent());
            invoiceRepository.save(invoice);
            paymentRepository.save(payment);
            log.info("Stripe payment recorded for invoice {}: {}", invoiceId, amount);
        });
    }

    // ── Private helpers ────────────────────────────────────────────────────

    private Invoice getOwnedInvoice(UUID invoiceId, UUID orgId) {
        return invoiceRepository.findByIdAndOrganisationId(invoiceId, orgId)
                .orElseThrow(() -> new IllegalArgumentException("Invoice not found: " + invoiceId));
    }

    private void validatePayable(Invoice invoice) {
        if (invoice.getStatus() == InvoiceStatus.PAID || invoice.getStatus() == InvoiceStatus.VOID) {
            throw new IllegalStateException("Invoice " + invoice.getNumber() + " cannot receive payments in status " + invoice.getStatus());
        }
    }
}
