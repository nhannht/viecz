package com.viecz.server.repository;

import com.viecz.server.model.Job;
import com.viecz.server.model.JobApplication;
import com.viecz.server.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository interface for JobApplication entity.
 */
@Repository
public interface JobApplicationRepository extends JpaRepository<JobApplication, Long> {

    /**
     * Find applications for a specific job
     */
    List<JobApplication> findByTaskId(Long taskId);

    /**
     * Find applications by a specific tasker
     */
    List<JobApplication> findByTaskerId(Long taskerId);

    /**
     * Find applications by status
     */
    List<JobApplication> findByStatus(JobApplication.ApplicationStatus status);

    /**
     * Check if tasker already applied to this job
     */
    boolean existsByTaskIdAndTaskerId(Long taskId, Long taskerId);

    /**
     * Find specific application
     */
    Optional<JobApplication> findByTaskIdAndTaskerId(Long taskId, Long taskerId);

    /**
     * Find pending applications for a job
     */
    List<JobApplication> findByTaskIdAndStatus(Long taskId, JobApplication.ApplicationStatus status);

    /**
     * Check if tasker already applied to this job (using objects)
     */
    boolean existsByTaskAndTasker(Job task, User tasker);

    /**
     * Find applications for a specific job (using object)
     */
    List<JobApplication> findByTask(Job task);

    /**
     * Find applications by tasker (using object)
     */
    List<JobApplication> findByTasker(User tasker);

    /**
     * Find applications by job and status (using objects)
     */
    List<JobApplication> findByTaskAndStatus(Job task, JobApplication.ApplicationStatus status);
}
