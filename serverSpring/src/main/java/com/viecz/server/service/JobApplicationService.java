package com.viecz.server.service;

import com.viecz.server.dto.application.JobApplicationRequest;
import com.viecz.server.dto.application.JobApplicationResponse;
import com.viecz.server.mapper.JobApplicationMapper;
import com.viecz.server.model.*;
import com.viecz.server.model.Job.JobStatus;
import com.viecz.server.model.JobApplication.ApplicationStatus;
import com.viecz.server.repository.JobApplicationRepository;
import com.viecz.server.repository.JobRepository;
import com.viecz.server.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Job application service for applying to jobs and managing applications
 */
@Service
@RequiredArgsConstructor
public class JobApplicationService {

    private final JobApplicationRepository applicationRepository;
    private final JobRepository jobRepository;
    private final UserRepository userRepository;
    private final JobApplicationMapper applicationMapper;

    /**
     * Apply for a job
     */
    @Transactional
    public JobApplicationResponse applyForJob(JobApplicationRequest request, String taskerEmail) {
        User tasker = userRepository.findByEmail(taskerEmail)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        Job job = jobRepository.findById(request.jobId())
                .orElseThrow(() -> new IllegalArgumentException("Job not found with id: " + request.jobId()));

        // Validation: Cannot apply to own job
        if (job.getRequester().getId().equals(tasker.getId())) {
            throw new IllegalArgumentException("Cannot apply to your own job");
        }

        // Validation: Job must be OPEN
        if (job.getStatus() != JobStatus.OPEN) {
            throw new IllegalArgumentException("Can only apply to jobs with OPEN status");
        }

        // Validation: Cannot apply twice
        if (applicationRepository.existsByTaskAndTasker(job, tasker)) {
            throw new IllegalArgumentException("You have already applied to this job");
        }

        JobApplication application = JobApplication.builder()
                .taskId(job.getId())
                .taskerId(tasker.getId())
                .proposedPrice(request.proposedPrice().multiply(java.math.BigDecimal.valueOf(100)).longValue())
                .message(request.message())
                .status(ApplicationStatus.PENDING)
                .build();

        application = applicationRepository.save(application);
        return applicationMapper.toResponse(application);
    }

    /**
     * Get all applications for a specific job (requester only)
     */
    @Transactional(readOnly = true)
    public List<JobApplicationResponse> getApplicationsForJob(Long jobId, String requesterEmail) {
        Job job = jobRepository.findById(jobId)
                .orElseThrow(() -> new IllegalArgumentException("Job not found with id: " + jobId));

        // Verify ownership
        if (!job.getRequester().getEmail().equals(requesterEmail)) {
            throw new IllegalArgumentException("You are not authorized to view applications for this job");
        }

        List<JobApplication> applications = applicationRepository.findByTask(job);
        return applicationMapper.toResponseList(applications);
    }

    /**
     * Get all applications by the current user (tasker)
     */
    @Transactional(readOnly = true)
    public List<JobApplicationResponse> getMyApplications(String taskerEmail) {
        User tasker = userRepository.findByEmail(taskerEmail)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        List<JobApplication> applications = applicationRepository.findByTasker(tasker);
        return applicationMapper.toResponseList(applications);
    }

    /**
     * Update application status (requester only)
     */
    @Transactional
    public JobApplicationResponse updateApplicationStatus(
            Long applicationId,
            ApplicationStatus newStatus,
            String requesterEmail
    ) {
        JobApplication application = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new IllegalArgumentException("Application not found with id: " + applicationId));

        // Verify ownership
        if (!application.getTask().getRequester().getEmail().equals(requesterEmail)) {
            throw new IllegalArgumentException("You are not authorized to update this application");
        }

        application.setStatus(newStatus);

        // If accepted, update job status and assign tasker
        if (newStatus == ApplicationStatus.ACCEPTED) {
            Job job = application.getTask();
            job.setTasker(application.getTasker());
            job.setStatus(JobStatus.IN_PROGRESS);
            jobRepository.save(job);

            // Reject all other pending applications
            List<JobApplication> otherApplications = applicationRepository
                    .findByTaskAndStatus(job, ApplicationStatus.PENDING);
            otherApplications.forEach(app -> {
                if (!app.getId().equals(applicationId)) {
                    app.setStatus(ApplicationStatus.REJECTED);
                }
            });
            applicationRepository.saveAll(otherApplications);
        }

        application = applicationRepository.save(application);
        return applicationMapper.toResponse(application);
    }

    /**
     * Withdraw application (tasker only)
     */
    @Transactional
    public void withdrawApplication(Long applicationId, String taskerEmail) {
        JobApplication application = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new IllegalArgumentException("Application not found with id: " + applicationId));

        // Verify ownership
        if (!application.getTasker().getEmail().equals(taskerEmail)) {
            throw new IllegalArgumentException("You are not authorized to withdraw this application");
        }

        // Can only withdraw PENDING applications
        if (application.getStatus() != ApplicationStatus.PENDING) {
            throw new IllegalArgumentException("Can only withdraw pending applications");
        }

        applicationRepository.delete(application);
    }
}
