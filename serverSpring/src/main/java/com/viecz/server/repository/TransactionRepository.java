package com.viecz.server.repository;

import com.viecz.server.model.Transaction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository interface for Transaction entity.
 */
@Repository
public interface TransactionRepository extends JpaRepository<Transaction, Long> {

    /**
     * Find transactions for a task
     */
    List<Transaction> findByTaskId(Long taskId);

    /**
     * Find transactions by payer
     */
    List<Transaction> findByPayerId(Long payerId);

    /**
     * Find transactions by payee
     */
    List<Transaction> findByPayeeId(Long payeeId);

    /**
     * Find transactions by type
     */
    List<Transaction> findByType(Transaction.TransactionType type);

    /**
     * Find transactions by status
     */
    List<Transaction> findByStatus(Transaction.TransactionStatus status);

    /**
     * Find transaction by PayOS order code
     */
    Optional<Transaction> findByPayosOrderCode(Long payosOrderCode);

    /**
     * Find pending transactions for a task
     */
    List<Transaction> findByTaskIdAndStatus(Long taskId, Transaction.TransactionStatus status);

    /**
     * Find transactions by payer or payee with pagination
     */
    Page<Transaction> findByPayerIdOrPayeeId(Long payerId, Long payeeId, Pageable pageable);

    /**
     * Find transactions for a task with pagination
     */
    Page<Transaction> findByTaskId(Long taskId, Pageable pageable);

    /**
     * Find transaction by task, type, and status
     */
    Optional<Transaction> findByTaskIdAndTypeAndStatus(Long taskId, Transaction.TransactionType type, Transaction.TransactionStatus status);

    /**
     * Check if transaction exists by task and type
     */
    boolean existsByTaskIdAndType(Long taskId, Transaction.TransactionType type);
}
