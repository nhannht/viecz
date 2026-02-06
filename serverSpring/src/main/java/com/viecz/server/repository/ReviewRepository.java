package com.viecz.server.repository;

import com.viecz.server.model.Review;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

/**
 * Repository interface for Review entity.
 */
@Repository
public interface ReviewRepository extends JpaRepository<Review, Long> {

    /**
     * Find review for a specific task
     */
    List<Review> findByTaskId(Long taskId);

    /**
     * Find reviews written by a user
     */
    List<Review> findByReviewerId(Long reviewerId);

    /**
     * Find reviews received by a user
     */
    List<Review> findByRevieweeId(Long revieweeId);

    /**
     * Calculate average rating for a user
     */
    @Query("SELECT AVG(r.rating) FROM Review r WHERE r.revieweeId = :userId")
    BigDecimal calculateAverageRating(@Param("userId") Long userId);

    /**
     * Check if review exists for task
     */
    boolean existsByTaskIdAndReviewerId(Long taskId, Long reviewerId);

    /**
     * Find specific review
     */
    Optional<Review> findByTaskIdAndReviewerId(Long taskId, Long reviewerId);
}
