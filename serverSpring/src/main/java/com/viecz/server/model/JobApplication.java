package com.viecz.server.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * JobApplication entity representing a tasker's application to a job.
 * Called "TaskApplication" in the Go codebase.
 */
@Entity
@Table(name = "task_applications", indexes = {
    @Index(name = "idx_task_id", columnList = "task_id"),
    @Index(name = "idx_tasker_id", columnList = "tasker_id"),
    @Index(name = "idx_status", columnList = "status")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class JobApplication {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "task_id", nullable = false)
    private Long taskId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "task_id", insertable = false, updatable = false)
    private Job task;

    @Column(name = "tasker_id", nullable = false)
    private Long taskerId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tasker_id", insertable = false, updatable = false)
    private User tasker;

    @Column(name = "proposed_price")
    private Long proposedPrice;

    @Column(length = 500)
    private String message;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private ApplicationStatus status = ApplicationStatus.PENDING;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    /**
     * Application status enum
     */
    public enum ApplicationStatus {
        PENDING("pending"),
        ACCEPTED("accepted"),
        REJECTED("rejected");

        private final String value;

        ApplicationStatus(String value) {
            this.value = value;
        }

        public String getValue() {
            return value;
        }
    }
}
