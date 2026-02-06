package com.viecz.server.service;

import com.viecz.server.dto.job.JobRequest;
import com.viecz.server.dto.job.JobResponse;
import com.viecz.server.mapper.JobMapper;
import com.viecz.server.model.Category;
import com.viecz.server.model.Job;
import com.viecz.server.model.Job.JobStatus;
import com.viecz.server.model.User;
import com.viecz.server.repository.CategoryRepository;
import com.viecz.server.repository.JobRepository;
import com.viecz.server.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Job service for CRUD and search operations
 */
@Service
@RequiredArgsConstructor
public class JobService {

    private final JobRepository jobRepository;
    private final CategoryRepository categoryRepository;
    private final UserRepository userRepository;
    private final JobMapper jobMapper;

    /**
     * Create a new job
     */
    @Transactional
    public JobResponse createJob(JobRequest request, String requesterEmail) {
        User requester = userRepository.findByEmail(requesterEmail)
                .orElseThrow(() -> new IllegalArgumentException("Requester not found"));

        Category category = categoryRepository.findById(request.categoryId())
                .orElseThrow(() -> new IllegalArgumentException("Category not found with id: " + request.categoryId()));

        Job job = jobMapper.toEntity(request);
        job.setRequester(requester);
        job.setCategory(category);
        job.setStatus(JobStatus.OPEN);

        job = jobRepository.save(job);
        return jobMapper.toResponse(job);
    }

    /**
     * Update an existing job
     */
    @Transactional
    public JobResponse updateJob(Long jobId, JobRequest request, String requesterEmail) {
        Job job = jobRepository.findById(jobId)
                .orElseThrow(() -> new IllegalArgumentException("Job not found with id: " + jobId));

        // Verify ownership
        if (!job.getRequester().getEmail().equals(requesterEmail)) {
            throw new IllegalArgumentException("You are not authorized to update this job");
        }

        // Cannot update completed or cancelled jobs
        if (job.getStatus() == JobStatus.COMPLETED || job.getStatus() == JobStatus.CANCELLED) {
            throw new IllegalArgumentException("Cannot update a " + job.getStatus().name().toLowerCase() + " job");
        }

        // Update category if changed
        if (!job.getCategory().getId().equals(request.categoryId())) {
            Category category = categoryRepository.findById(request.categoryId())
                    .orElseThrow(() -> new IllegalArgumentException("Category not found with id: " + request.categoryId()));
            job.setCategory(category);
        }

        jobMapper.updateEntity(request, job);
        job = jobRepository.save(job);
        return jobMapper.toResponse(job);
    }

    /**
     * Delete a job (only if OPEN status)
     */
    @Transactional
    public void deleteJob(Long jobId, String requesterEmail) {
        Job job = jobRepository.findById(jobId)
                .orElseThrow(() -> new IllegalArgumentException("Job not found with id: " + jobId));

        // Verify ownership
        if (!job.getRequester().getEmail().equals(requesterEmail)) {
            throw new IllegalArgumentException("You are not authorized to delete this job");
        }

        // Can only delete OPEN jobs
        if (job.getStatus() != JobStatus.OPEN) {
            throw new IllegalArgumentException("Can only delete jobs with OPEN status");
        }

        jobRepository.delete(job);
    }

    /**
     * Get job by ID
     */
    @Transactional(readOnly = true)
    public JobResponse getJobById(Long jobId) {
        Job job = jobRepository.findById(jobId)
                .orElseThrow(() -> new IllegalArgumentException("Job not found with id: " + jobId));
        return jobMapper.toResponse(job);
    }

    /**
     * Search jobs with filters
     */
    @Transactional(readOnly = true)
    public Page<JobResponse> searchJobs(
            String query,
            Integer categoryId,
            JobStatus status,
            Pageable pageable
    ) {
        Page<Job> jobs = jobRepository.searchJobs(query, categoryId, status, pageable);
        return jobs.map(jobMapper::toResponse);
    }

    /**
     * Get jobs by requester
     */
    @Transactional(readOnly = true)
    public Page<JobResponse> getJobsByRequester(String requesterEmail, Pageable pageable) {
        User requester = userRepository.findByEmail(requesterEmail)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        Page<Job> jobs = jobRepository.findByRequester(requester, pageable);
        return jobs.map(jobMapper::toResponse);
    }

    /**
     * Get jobs by tasker
     */
    @Transactional(readOnly = true)
    public Page<JobResponse> getJobsByTasker(String taskerEmail, Pageable pageable) {
        User tasker = userRepository.findByEmail(taskerEmail)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        Page<Job> jobs = jobRepository.findByTasker(tasker, pageable);
        return jobs.map(jobMapper::toResponse);
    }

    /**
     * Update job status
     */
    @Transactional
    public JobResponse updateJobStatus(Long jobId, JobStatus newStatus, String userEmail) {
        Job job = jobRepository.findById(jobId)
                .orElseThrow(() -> new IllegalArgumentException("Job not found with id: " + jobId));

        // Only requester or tasker can update status
        boolean isRequester = job.getRequester().getEmail().equals(userEmail);
        boolean isTasker = job.getTasker() != null && job.getTasker().getEmail().equals(userEmail);

        if (!isRequester && !isTasker) {
            throw new IllegalArgumentException("You are not authorized to update this job status");
        }

        job.setStatus(newStatus);
        job = jobRepository.save(job);
        return jobMapper.toResponse(job);
    }
}
