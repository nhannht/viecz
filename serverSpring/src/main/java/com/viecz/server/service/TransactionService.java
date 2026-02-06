package com.viecz.server.service;

import com.viecz.server.dto.transaction.TransactionResponse;
import com.viecz.server.mapper.TransactionMapper;
import com.viecz.server.model.Job;
import com.viecz.server.model.Job.JobStatus;
import com.viecz.server.model.Transaction;
import com.viecz.server.model.User;
import com.viecz.server.repository.JobRepository;
import com.viecz.server.repository.TransactionRepository;
import com.viecz.server.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * Transaction service for managing escrow, releases, and refunds
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class TransactionService {

    private final TransactionRepository transactionRepository;
    private final JobRepository jobRepository;
    private final UserRepository userRepository;
    private final TransactionMapper transactionMapper;

    /**
     * Get transaction by ID
     */
    @Transactional(readOnly = true)
    public TransactionResponse getTransactionById(Long transactionId, String userEmail) {
        Transaction transaction = transactionRepository.findById(transactionId)
                .orElseThrow(() -> new IllegalArgumentException("Transaction not found with id: " + transactionId));

        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        // Verify user is involved in the transaction
        if (!transaction.getPayerId().equals(user.getId()) &&
            (transaction.getPayeeId() == null || !transaction.getPayeeId().equals(user.getId()))) {
            throw new IllegalArgumentException("You are not authorized to view this transaction");
        }

        return transactionMapper.toResponse(transaction);
    }

    /**
     * Get all transactions for a user
     */
    @Transactional(readOnly = true)
    public Page<TransactionResponse> getUserTransactions(String userEmail, Pageable pageable) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        Page<Transaction> transactions = transactionRepository.findByPayerIdOrPayeeId(user.getId(), user.getId(), pageable);
        return transactions.map(transactionMapper::toResponse);
    }

    /**
     * Get transactions for a specific job
     */
    @Transactional(readOnly = true)
    public Page<TransactionResponse> getJobTransactions(Long jobId, String userEmail, Pageable pageable) {
        Job job = jobRepository.findById(jobId)
                .orElseThrow(() -> new IllegalArgumentException("Job not found with id: " + jobId));

        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        // Verify user is involved in the job
        boolean isRequester = job.getRequester().getId().equals(user.getId());
        boolean isTasker = job.getTasker() != null && job.getTasker().getId().equals(user.getId());

        if (!isRequester && !isTasker) {
            throw new IllegalArgumentException("You are not authorized to view transactions for this job");
        }

        Page<Transaction> transactions = transactionRepository.findByTaskId(jobId, pageable);
        return transactions.map(transactionMapper::toResponse);
    }

    /**
     * Release escrow funds to tasker when job is completed
     */
    @Transactional
    public TransactionResponse releaseEscrow(Long jobId, String requesterEmail) {
        Job job = jobRepository.findById(jobId)
                .orElseThrow(() -> new IllegalArgumentException("Job not found with id: " + jobId));

        // Verify requester
        if (!job.getRequester().getEmail().equals(requesterEmail)) {
            throw new IllegalArgumentException("Only the job requester can release funds");
        }

        // Verify job is completed
        if (job.getStatus() != JobStatus.COMPLETED) {
            throw new IllegalArgumentException("Can only release funds for completed jobs");
        }

        // Verify tasker exists
        if (job.getTasker() == null) {
            throw new IllegalArgumentException("Job has no assigned tasker");
        }

        // Find successful escrow transaction
        Transaction escrowTransaction = transactionRepository
                .findByTaskIdAndTypeAndStatus(jobId, Transaction.TransactionType.ESCROW, Transaction.TransactionStatus.SUCCESS)
                .orElseThrow(() -> new IllegalArgumentException("No successful escrow transaction found for this job"));

        // Check if already released
        if (transactionRepository.existsByTaskIdAndType(jobId, Transaction.TransactionType.RELEASE)) {
            throw new IllegalArgumentException("Funds have already been released for this job");
        }

        // Create release transaction
        Transaction releaseTransaction = Transaction.builder()
                .taskId(job.getId())
                .payerId(job.getRequester().getId())
                .payeeId(job.getTasker().getId())
                .amount(escrowTransaction.getNetAmount())
                .platformFee(0L)
                .netAmount(escrowTransaction.getNetAmount())
                .type(Transaction.TransactionType.RELEASE)
                .status(Transaction.TransactionStatus.SUCCESS)
                .description("Fund release for completed job: " + job.getTitle())
                .completedAt(LocalDateTime.now())
                .build();

        releaseTransaction = transactionRepository.save(releaseTransaction);
        log.info("Escrow funds released for job {}, amount: {}", jobId, escrowTransaction.getNetAmount());

        return transactionMapper.toResponse(releaseTransaction);
    }

    /**
     * Refund escrow funds to requester (e.g., job cancelled)
     */
    @Transactional
    public TransactionResponse refundEscrow(Long jobId, String requesterEmail, String reason) {
        Job job = jobRepository.findById(jobId)
                .orElseThrow(() -> new IllegalArgumentException("Job not found with id: " + jobId));

        // Verify requester
        if (!job.getRequester().getEmail().equals(requesterEmail)) {
            throw new IllegalArgumentException("Only the job requester can request a refund");
        }

        // Verify job is cancelled
        if (job.getStatus() != JobStatus.CANCELLED) {
            throw new IllegalArgumentException("Can only refund for cancelled jobs");
        }

        // Find successful escrow transaction
        Transaction escrowTransaction = transactionRepository
                .findByTaskIdAndTypeAndStatus(jobId, Transaction.TransactionType.ESCROW, Transaction.TransactionStatus.SUCCESS)
                .orElseThrow(() -> new IllegalArgumentException("No successful escrow transaction found for this job"));

        // Check if already refunded or released
        if (transactionRepository.existsByTaskIdAndType(jobId, Transaction.TransactionType.REFUND)) {
            throw new IllegalArgumentException("Funds have already been refunded for this job");
        }
        if (transactionRepository.existsByTaskIdAndType(jobId, Transaction.TransactionType.RELEASE)) {
            throw new IllegalArgumentException("Funds have already been released, cannot refund");
        }

        // Create refund transaction (refund full amount including platform fee)
        Transaction refundTransaction = Transaction.builder()
                .taskId(job.getId())
                .payerId(null) // System refund
                .payeeId(job.getRequester().getId())
                .amount(escrowTransaction.getAmount())
                .platformFee(0L)
                .netAmount(escrowTransaction.getAmount())
                .type(Transaction.TransactionType.REFUND)
                .status(Transaction.TransactionStatus.SUCCESS)
                .description("Refund for cancelled job: " + job.getTitle() + ". Reason: " + reason)
                .completedAt(LocalDateTime.now())
                .build();

        refundTransaction = transactionRepository.save(refundTransaction);
        log.info("Escrow funds refunded for job {}, amount: {}", jobId, escrowTransaction.getAmount());

        return transactionMapper.toResponse(refundTransaction);
    }
}
