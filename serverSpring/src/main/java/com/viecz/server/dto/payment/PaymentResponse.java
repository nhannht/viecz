package com.viecz.server.dto.payment;

/**
 * Payment creation response with checkout URL
 */
public record PaymentResponse(
        Long transactionId,
        Long orderCode,
        String checkoutUrl,
        String qrCode,
        Long amount,
        String status
) {}
