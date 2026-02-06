package com.viecz.server.dto.payment;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

/**
 * Request to create a payment for a job
 */
public record CreatePaymentRequest(
        @NotNull(message = "Job ID is required")
        Long jobId,

        @NotNull(message = "Amount is required")
        @DecimalMin(value = "0.0", inclusive = false, message = "Amount must be greater than 0")
        BigDecimal amount,

        String description,

        String returnUrl,

        String cancelUrl
) {}
