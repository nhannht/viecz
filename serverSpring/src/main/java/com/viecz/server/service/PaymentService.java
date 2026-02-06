package com.viecz.server.service;

import com.viecz.server.dto.payment.CreatePaymentRequest;
import com.viecz.server.dto.payment.PaymentResponse;
import com.viecz.server.model.Job;
import com.viecz.server.model.Transaction;
import com.viecz.server.model.User;
import com.viecz.server.repository.JobRepository;
import com.viecz.server.repository.TransactionRepository;
import com.viecz.server.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.payos.PayOS;
import vn.payos.model.v2.paymentRequests.CreatePaymentLinkRequest;
import vn.payos.model.v2.paymentRequests.CreatePaymentLinkResponse;
import vn.payos.model.v2.paymentRequests.PaymentLink;
import vn.payos.model.webhooks.WebhookData;

/**
 * Payment service for PayOS integration
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentService {

    private final PayOS payOS;
    private final TransactionRepository transactionRepository;
    private final JobRepository jobRepository;
    private final UserRepository userRepository;

    @Value("${app.client-url}")
    private String clientUrl;

    private static final double PLATFORM_FEE_PERCENTAGE = 0.10; // 10% platform fee

    /**
     * Create payment link for job escrow
     */
    @Transactional
    public PaymentResponse createPaymentLink(CreatePaymentRequest request, String payerEmail) {
        User payer = userRepository.findByEmail(payerEmail)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        Job job = jobRepository.findById(request.jobId())
                .orElseThrow(() -> new IllegalArgumentException("Job not found with id: " + request.jobId()));

        // Verify user is the job requester
        if (!job.getRequester().getId().equals(payer.getId())) {
            throw new IllegalArgumentException("Only the job requester can make payment");
        }

        // Generate unique order code
        long orderCode = System.currentTimeMillis() / 1000;

        // Calculate amounts (PayOS uses VND, amounts in cents/smallest unit)
        long amountInCents = request.amount().multiply(java.math.BigDecimal.valueOf(100)).longValue();
        long platformFee = (long) (amountInCents * PLATFORM_FEE_PERCENTAGE);
        long netAmount = amountInCents - platformFee;

        // Create transaction record
        Transaction transaction = Transaction.builder()
                .taskId(job.getId())
                .payerId(payer.getId())
                .amount(amountInCents)
                .platformFee(platformFee)
                .netAmount(netAmount)
                .type(Transaction.TransactionType.ESCROW)
                .status(Transaction.TransactionStatus.PENDING)
                .payosOrderCode(orderCode)
                .description(request.description() != null ? request.description() : "Payment for job: " + job.getTitle())
                .build();

        transaction = transactionRepository.save(transaction);

        try {
            // Create PayOS payment link
            CreatePaymentLinkRequest paymentLinkRequest = CreatePaymentLinkRequest.builder()
                    .orderCode(orderCode)
                    .amount(amountInCents)
                    .description(transaction.getDescription())
                    .returnUrl(request.returnUrl() != null ? request.returnUrl() : clientUrl + "/payment/success")
                    .cancelUrl(request.cancelUrl() != null ? request.cancelUrl() : clientUrl + "/payment/cancel")
                    .build();

            CreatePaymentLinkResponse paymentLinkData = payOS.paymentRequests().create(paymentLinkRequest);

            // Update transaction with payment link ID
            transaction.setPayosPaymentId(paymentLinkData.getPaymentLinkId());
            transactionRepository.save(transaction);

            log.info("Payment link created for job {}: order code {}", job.getId(), orderCode);

            return new PaymentResponse(
                    transaction.getId(),
                    orderCode,
                    paymentLinkData.getCheckoutUrl(),
                    paymentLinkData.getQrCode(),
                    amountInCents,
                    transaction.getStatus().getValue()
            );

        } catch (Exception e) {
            log.error("Failed to create payment link for job {}", job.getId(), e);
            transaction.setStatus(Transaction.TransactionStatus.FAILED);
            transaction.setFailureReason("PayOS API error: " + e.getMessage());
            transactionRepository.save(transaction);
            throw new IllegalStateException("Failed to create payment link: " + e.getMessage(), e);
        }
    }

    /**
     * Handle PayOS webhook callback
     */
    @Transactional
    public void handleWebhook(String webhookBody) {
        try {
            // Verify webhook signature
            WebhookData data = payOS.webhooks().verify(webhookBody);
            log.info("Webhook received for order code: {}", data.getOrderCode());

            // Find transaction by order code
            Transaction transaction = transactionRepository.findByPayosOrderCode(data.getOrderCode())
                    .orElseThrow(() -> new IllegalArgumentException("Transaction not found for order code: " + data.getOrderCode()));

            // Update transaction status based on webhook code
            if ("00".equals(data.getCode())) {
                // Payment successful
                transaction.setStatus(Transaction.TransactionStatus.SUCCESS);
                transaction.setCompletedAt(java.time.LocalDateTime.now());
                log.info("Payment successful for transaction {}, order code {}", transaction.getId(), data.getOrderCode());
            } else {
                // Payment failed
                transaction.setStatus(Transaction.TransactionStatus.FAILED);
                transaction.setFailureReason("Payment failed: " + data.getDescription());
                log.warn("Payment failed for transaction {}, order code {}: {}", transaction.getId(), data.getOrderCode(), data.getDescription());
            }

            transactionRepository.save(transaction);

        } catch (Exception e) {
            log.error("Failed to process webhook", e);
            throw new IllegalStateException("Webhook processing failed: " + e.getMessage(), e);
        }
    }

    /**
     * Get payment link data from PayOS
     */
    @Transactional(readOnly = true)
    public PaymentLink getPaymentLinkData(Long orderCode) {
        try {
            return payOS.paymentRequests().get(orderCode);
        } catch (Exception e) {
            log.error("Failed to get payment link data for order code {}", orderCode, e);
            throw new IllegalStateException("Failed to retrieve payment link: " + e.getMessage(), e);
        }
    }

    /**
     * Cancel payment link
     */
    @Transactional
    public void cancelPaymentLink(Long orderCode, String userEmail) {
        Transaction transaction = transactionRepository.findByPayosOrderCode(orderCode)
                .orElseThrow(() -> new IllegalArgumentException("Transaction not found for order code: " + orderCode));

        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        // Verify user is the payer
        if (!transaction.getPayerId().equals(user.getId())) {
            throw new IllegalArgumentException("Only the payer can cancel the payment");
        }

        // Can only cancel pending payments
        if (transaction.getStatus() != Transaction.TransactionStatus.PENDING) {
            throw new IllegalArgumentException("Can only cancel pending payments");
        }

        try {
            payOS.paymentRequests().cancel(orderCode, null);
            transaction.setStatus(Transaction.TransactionStatus.CANCELLED);
            transactionRepository.save(transaction);
            log.info("Payment link cancelled for order code {}", orderCode);
        } catch (Exception e) {
            log.error("Failed to cancel payment link for order code {}", orderCode, e);
            throw new IllegalStateException("Failed to cancel payment: " + e.getMessage(), e);
        }
    }
}
