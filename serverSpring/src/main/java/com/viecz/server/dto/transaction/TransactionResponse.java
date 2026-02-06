package com.viecz.server.dto.transaction;

import com.viecz.server.model.Transaction;

import java.time.LocalDateTime;

/**
 * Transaction response DTO
 */
public record TransactionResponse(
        Long id,
        Long jobId,
        String jobTitle,
        Long payerId,
        String payerName,
        Long payeeId,
        String payeeName,
        Long amount,
        Long platformFee,
        Long netAmount,
        Transaction.TransactionType type,
        Transaction.TransactionStatus status,
        Long payosOrderCode,
        String payosPaymentId,
        String description,
        String failureReason,
        LocalDateTime completedAt,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}
