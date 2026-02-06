package com.viecz.server.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.annotations.SQLRestriction;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Conversation entity representing a chat conversation between a job poster and tasker.
 * Each conversation is associated with a specific job.
 */
@Entity
@Table(name = "conversations", indexes = {
    @Index(name = "idx_task_id", columnList = "task_id"),
    @Index(name = "idx_poster_id", columnList = "poster_id"),
    @Index(name = "idx_tasker_id", columnList = "tasker_id")
})
@SQLDelete(sql = "UPDATE conversations SET deleted_at = NOW() WHERE id = ?")
@SQLRestriction("deleted_at IS NULL")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Conversation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "task_id", nullable = false)
    private Long taskId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "task_id", insertable = false, updatable = false)
    private Job task;

    @Column(name = "poster_id", nullable = false)
    private Long posterId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "poster_id", insertable = false, updatable = false)
    private User poster;

    @Column(name = "tasker_id", nullable = false)
    private Long taskerId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tasker_id", insertable = false, updatable = false)
    private User tasker;

    @Column(name = "last_message_at")
    private LocalDateTime lastMessageAt;

    @Column(name = "last_message", columnDefinition = "TEXT")
    private String lastMessage;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    // Relationships
    @OneToMany(mappedBy = "conversation", cascade = CascadeType.ALL)
    private List<Message> messages;
}
