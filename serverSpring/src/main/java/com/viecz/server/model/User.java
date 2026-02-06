package com.viecz.server.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * User entity representing a user in the Viecz platform.
 * Users can be both job posters (requesters) and job applicants (taskers).
 */
@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false, length = 255)
    private String email;

    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "avatar_url", columnDefinition = "TEXT")
    private String avatarUrl;

    @Column(length = 20)
    private String phone;

    @Column(nullable = false, length = 255)
    @Builder.Default
    private String university = "ĐHQG-HCM";

    @Column(name = "student_id", length = 50)
    private String studentId;

    @Column(name = "is_verified", nullable = false)
    @Builder.Default
    private Boolean isVerified = false;

    @Column(precision = 3, scale = 2, nullable = false)
    @Builder.Default
    private BigDecimal rating = BigDecimal.ZERO;

    @Column(name = "total_tasks_completed", nullable = false)
    @Builder.Default
    private Integer totalTasksCompleted = 0;

    @Column(name = "total_tasks_posted", nullable = false)
    @Builder.Default
    private Integer totalTasksPosted = 0;

    @Column(name = "total_earnings", nullable = false)
    @Builder.Default
    private Long totalEarnings = 0L;

    @Column(name = "is_tasker", nullable = false)
    @Builder.Default
    private Boolean isTasker = false;

    @Column(name = "tasker_bio", length = 500)
    private String taskerBio;

    @Column(name = "tasker_skills", columnDefinition = "TEXT[]")
    private String[] taskerSkills;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    // Relationships (will be added as we create other entities)
    // @OneToMany(mappedBy = "requester")
    // private List<Job> postedJobs;

    // @OneToMany(mappedBy = "tasker")
    // private List<Job> acceptedJobs;

    // @OneToMany(mappedBy = "tasker")
    // private List<JobApplication> applications;
}
