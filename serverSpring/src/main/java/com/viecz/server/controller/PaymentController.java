package com.viecz.server.controller;

import com.viecz.server.dto.payment.CreatePaymentRequest;
import com.viecz.server.dto.payment.PaymentResponse;
import com.viecz.server.dto.transaction.TransactionResponse;
import com.viecz.server.service.PaymentService;
import com.viecz.server.service.TransactionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

/**
 * Payment and transaction REST controller
 */
@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
@Slf4j
public class PaymentController {

    private final PaymentService paymentService;
    private final TransactionService transactionService;

    /**
     * Create payment link for job escrow
     * POST /api/payments/create
     */
    @PostMapping("/create")
    public ResponseEntity<PaymentResponse> createPayment(
            @Valid @RequestBody CreatePaymentRequest request,
            Authentication authentication
    ) {
        PaymentResponse response = paymentService.createPaymentLink(request, authentication.getName());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * PayOS webhook endpoint
     * POST /api/payments/webhook
     */
    @PostMapping("/webhook")
    public ResponseEntity<String> handleWebhook(@RequestBody String webhookBody) {
        log.info("Received webhook from PayOS");
        paymentService.handleWebhook(webhookBody);
        return ResponseEntity.ok("OK");
    }

    /**
     * Cancel payment link
     * POST /api/payments/{orderCode}/cancel
     */
    @PostMapping("/{orderCode}/cancel")
    public ResponseEntity<Void> cancelPayment(
            @PathVariable Long orderCode,
            Authentication authentication
    ) {
        paymentService.cancelPaymentLink(orderCode, authentication.getName());
        return ResponseEntity.noContent().build();
    }

    /**
     * Get transaction by ID
     * GET /api/payments/transactions/{id}
     */
    @GetMapping("/transactions/{id}")
    public ResponseEntity<TransactionResponse> getTransaction(
            @PathVariable Long id,
            Authentication authentication
    ) {
        TransactionResponse transaction = transactionService.getTransactionById(id, authentication.getName());
        return ResponseEntity.ok(transaction);
    }

    /**
     * Get all transactions for current user
     * GET /api/payments/transactions
     */
    @GetMapping("/transactions")
    public ResponseEntity<Page<TransactionResponse>> getMyTransactions(
            Authentication authentication,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        Page<TransactionResponse> transactions = transactionService.getUserTransactions(authentication.getName(), pageable);
        return ResponseEntity.ok(transactions);
    }

    /**
     * Get transactions for a specific job
     * GET /api/payments/transactions/job/{jobId}
     */
    @GetMapping("/transactions/job/{jobId}")
    public ResponseEntity<Page<TransactionResponse>> getJobTransactions(
            @PathVariable Long jobId,
            Authentication authentication,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        Page<TransactionResponse> transactions = transactionService.getJobTransactions(jobId, authentication.getName(), pageable);
        return ResponseEntity.ok(transactions);
    }

    /**
     * Release escrow funds to tasker (job completed)
     * POST /api/payments/release/{jobId}
     */
    @PostMapping("/release/{jobId}")
    public ResponseEntity<TransactionResponse> releaseEscrow(
            @PathVariable Long jobId,
            Authentication authentication
    ) {
        TransactionResponse transaction = transactionService.releaseEscrow(jobId, authentication.getName());
        return ResponseEntity.ok(transaction);
    }

    /**
     * Refund escrow funds to requester (job cancelled)
     * POST /api/payments/refund/{jobId}
     */
    @PostMapping("/refund/{jobId}")
    public ResponseEntity<TransactionResponse> refundEscrow(
            @PathVariable Long jobId,
            @RequestParam(required = false, defaultValue = "Job cancelled") String reason,
            Authentication authentication
    ) {
        TransactionResponse transaction = transactionService.refundEscrow(jobId, authentication.getName(), reason);
        return ResponseEntity.ok(transaction);
    }
}
