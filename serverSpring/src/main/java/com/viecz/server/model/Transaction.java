package com.viecz.server.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * Transaction entity representing payment transactions in the system.
 * Handles escrow, release, refund, and platform fee transactions.
 */
@Entity
@Table(name = "transactions", indexes = {
    @Index(name = "idx_task_id", columnList = "task_id"),
    @Index(name = "idx_payer_id", columnList = "payer_id"),
    @Index(name = "idx_payee_id", columnList = "payee_id"),
    @Index(name = "idx_type", columnList = "type"),
    @Index(name = "idx_status", columnList = "status")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Transaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "task_id")
    private Long taskId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "task_id", insertable = false, updatable = false)
    private Job task;

    @Column(name = "payer_id", nullable = false)
    private Long payerId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "payer_id", insertable = false, updatable = false)
    private User payer;

    @Column(name = "payee_id")
    private Long payeeId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "payee_id", insertable = false, updatable = false)
    private User payee;

    @Column(nullable = false)
    private Long amount;

    @Column(name = "platform_fee", nullable = false)
    @Builder.Default
    private Long platformFee = 0L;

    @Column(name = "net_amount", nullable = false)
    private Long netAmount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TransactionType type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private TransactionStatus status = TransactionStatus.PENDING;

    @Column(name = "payos_order_code", unique = true)
    private Long payosOrderCode;

    @Column(name = "payos_payment_id", columnDefinition = "TEXT")
    private String payosPaymentId;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "failure_reason", columnDefinition = "TEXT")
    private String failureReason;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    /**
     * Transaction type enum
     */
    public enum TransactionType {
        ESCROW("escrow"),
        RELEASE("release"),
        REFUND("refund"),
        PLATFORM_FEE("platform_fee"),
        DEPOSIT("deposit"),
        WITHDRAWAL("withdrawal");

        private final String value;

        TransactionType(String value) {
            this.value = value;
        }

        public String getValue() {
            return value;
        }
    }

    /**
     * Transaction status enum
     */
    public enum TransactionStatus {
        PENDING("pending"),
        SUCCESS("success"),
        FAILED("failed"),
        CANCELLED("cancelled");

        private final String value;

        TransactionStatus(String value) {
            this.value = value;
        }

        public String getValue() {
            return value;
        }
    }

    /**
     * Calculate net amount after platform fee
     */
    @PrePersist
    @PreUpdate
    public void calculateNetAmount() {
        if (amount != null && platformFee != null) {
            this.netAmount = this.amount - this.platformFee;
        }
    }
}
