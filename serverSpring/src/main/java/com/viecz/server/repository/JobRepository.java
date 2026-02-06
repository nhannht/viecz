package com.viecz.server.repository;

import com.viecz.server.model.Job;
import com.viecz.server.model.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository interface for Job entity.
 */
@Repository
public interface JobRepository extends JpaRepository<Job, Long> {

    /**
     * Find jobs by requester (job poster)
     */
    List<Job> findByRequesterId(Long requesterId);

    /**
     * Find jobs by tasker (job performer)
     */
    List<Job> findByTaskerId(Long taskerId);

    /**
     * Find jobs by category
     */
    List<Job> findByCategoryId(Integer categoryId);

    /**
     * Find jobs by status
     */
    List<Job> findByStatus(Job.JobStatus status);

    /**
     * Find open jobs (available for application)
     */
    List<Job> findByStatusOrderByCreatedAtDesc(Job.JobStatus status);

    /**
     * Search jobs by title or description
     */
    @Query("SELECT j FROM Job j WHERE " +
           "LOWER(j.title) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(j.description) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    List<Job> searchJobs(@Param("keyword") String keyword);

    /**
     * Search jobs with filters and pagination
     */
    @Query("SELECT j FROM Job j WHERE " +
           "(:query IS NULL OR LOWER(j.title) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(j.description) LIKE LOWER(CONCAT('%', :query, '%'))) AND " +
           "(:categoryId IS NULL OR j.categoryId = :categoryId) AND " +
           "(:status IS NULL OR j.status = :status)")
    Page<Job> searchJobs(@Param("query") String query,
                         @Param("categoryId") Integer categoryId,
                         @Param("status") Job.JobStatus status,
                         Pageable pageable);

    /**
     * Find jobs by requester with pagination
     */
    Page<Job> findByRequester(User requester, Pageable pageable);

    /**
     * Find jobs by tasker with pagination
     */
    Page<Job> findByTasker(User tasker, Pageable pageable);
}
