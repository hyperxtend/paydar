package com.paydar.payment.dto;

import com.paydar.domain.payment.PaymentMethod;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.Instant;

public record RecordPaymentRequest(

        @NotNull @DecimalMin("0.01")
        BigDecimal amount,

        @NotNull
        PaymentMethod paymentMethod,

        String reference,
        String notes,
        Instant paidAt   // defaults to now() if null
) {}
