package com.viecz.server.controller;

import com.viecz.server.dto.application.JobApplicationRequest;
import com.viecz.server.dto.application.JobApplicationResponse;
import com.viecz.server.model.JobApplication.ApplicationStatus;
import com.viecz.server.service.JobApplicationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Job application REST controller
 */
@RestController
@RequestMapping("/api/applications")
@RequiredArgsConstructor
public class JobApplicationController {

    private final JobApplicationService applicationService;

    /**
     * Apply for a job
     * POST /api/applications
     */
    @PostMapping
    public ResponseEntity<JobApplicationResponse> applyForJob(
            @Valid @RequestBody JobApplicationRequest request,
            Authentication authentication
    ) {
        JobApplicationResponse application = applicationService.applyForJob(request, authentication.getName());
        return ResponseEntity.status(HttpStatus.CREATED).body(application);
    }

    /**
     * Get all applications for a specific job (requester only)
     * GET /api/applications/job/{jobId}
     */
    @GetMapping("/job/{jobId}")
    public ResponseEntity<List<JobApplicationResponse>> getApplicationsForJob(
            @PathVariable Long jobId,
            Authentication authentication
    ) {
        List<JobApplicationResponse> applications = applicationService.getApplicationsForJob(jobId, authentication.getName());
        return ResponseEntity.ok(applications);
    }

    /**
     * Get all applications by the current user
     * GET /api/applications/my-applications
     */
    @GetMapping("/my-applications")
    public ResponseEntity<List<JobApplicationResponse>> getMyApplications(Authentication authentication) {
        List<JobApplicationResponse> applications = applicationService.getMyApplications(authentication.getName());
        return ResponseEntity.ok(applications);
    }

    /**
     * Update application status (requester only)
     * PATCH /api/applications/{id}/status
     */
    @PatchMapping("/{id}/status")
    public ResponseEntity<JobApplicationResponse> updateApplicationStatus(
            @PathVariable Long id,
            @RequestParam ApplicationStatus status,
            Authentication authentication
    ) {
        JobApplicationResponse application = applicationService.updateApplicationStatus(id, status, authentication.getName());
        return ResponseEntity.ok(application);
    }

    /**
     * Withdraw application (tasker only)
     * DELETE /api/applications/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> withdrawApplication(
            @PathVariable Long id,
            Authentication authentication
    ) {
        applicationService.withdrawApplication(id, authentication.getName());
        return ResponseEntity.noContent().build();
    }
}
