package com.paydar.payment;

import com.paydar.domain.user.User;
import com.paydar.payment.dto.PaymentResponse;
import com.paydar.payment.dto.RecordPaymentRequest;
import com.paydar.payment.dto.StripeCheckoutResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/v1/payments")
@RequiredArgsConstructor
@Slf4j
public class PaymentController {

    private final PaymentService paymentService;

    @Value("${app.stripe.webhook-secret:}")
    private String webhookSecret;

    /** GET /api/v1/payments — all payments for the org */
    @GetMapping
    public ResponseEntity<List<PaymentResponse>> getAll(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(paymentService.findAllByOrg(user.getOrganisation().getId()));
    }

    /** GET /api/v1/payments/invoice/{invoiceId} — payments for a specific invoice */
    @GetMapping("/invoice/{invoiceId}")
    public ResponseEntity<List<PaymentResponse>> getByInvoice(
            @PathVariable UUID invoiceId,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(paymentService.findByInvoice(invoiceId));
    }

    /** POST /api/v1/payments/invoice/{invoiceId} — record a manual payment */
    @PostMapping("/invoice/{invoiceId}")
    public ResponseEntity<PaymentResponse> record(
            @PathVariable UUID invoiceId,
            @Valid @RequestBody RecordPaymentRequest request,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(paymentService.record(invoiceId, user.getOrganisation().getId(), request, user));
    }

    /** POST /api/v1/payments/invoice/{invoiceId}/stripe-checkout — create Stripe session */
    @PostMapping("/invoice/{invoiceId}/stripe-checkout")
    public ResponseEntity<StripeCheckoutResponse> stripeCheckout(
            @PathVariable UUID invoiceId,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(
                paymentService.createStripeCheckout(invoiceId, user.getOrganisation().getId()));
    }

    /**
     * POST /api/v1/payments/stripe-webhook — Stripe webhook (no auth, signature-verified)
     * Must be excluded from the JWT filter chain in SecurityConfig.
     */
    @PostMapping("/stripe-webhook")
    public ResponseEntity<Void> stripeWebhook(
            @RequestBody String payload,
            @RequestHeader("Stripe-Signature") String sigHeader) {
        paymentService.handleStripeWebhook(payload, sigHeader, webhookSecret);
        return ResponseEntity.ok().build();
    }
}
