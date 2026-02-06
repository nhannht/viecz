package com.viecz.server.controller;

import com.viecz.server.dto.job.JobRequest;
import com.viecz.server.dto.job.JobResponse;
import com.viecz.server.model.Job.JobStatus;
import com.viecz.server.service.JobService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

/**
 * Job REST controller
 */
@RestController
@RequestMapping("/api/jobs")
@RequiredArgsConstructor
public class JobController {

    private final JobService jobService;

    /**
     * Create a new job
     * POST /api/jobs
     */
    @PostMapping
    public ResponseEntity<JobResponse> createJob(
            @Valid @RequestBody JobRequest request,
            Authentication authentication
    ) {
        JobResponse job = jobService.createJob(request, authentication.getName());
        return ResponseEntity.status(HttpStatus.CREATED).body(job);
    }

    /**
     * Update a job
     * PUT /api/jobs/{id}
     */
    @PutMapping("/{id}")
    public ResponseEntity<JobResponse> updateJob(
            @PathVariable Long id,
            @Valid @RequestBody JobRequest request,
            Authentication authentication
    ) {
        JobResponse job = jobService.updateJob(id, request, authentication.getName());
        return ResponseEntity.ok(job);
    }

    /**
     * Delete a job
     * DELETE /api/jobs/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteJob(
            @PathVariable Long id,
            Authentication authentication
    ) {
        jobService.deleteJob(id, authentication.getName());
        return ResponseEntity.noContent().build();
    }

    /**
     * Get job by ID
     * GET /api/jobs/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<JobResponse> getJobById(@PathVariable Long id) {
        JobResponse job = jobService.getJobById(id);
        return ResponseEntity.ok(job);
    }

    /**
     * Search jobs with filters
     * GET /api/jobs?query=...&categoryId=...&status=...
     */
    @GetMapping
    public ResponseEntity<Page<JobResponse>> searchJobs(
            @RequestParam(required = false) String query,
            @RequestParam(required = false) Integer categoryId,
            @RequestParam(required = false) JobStatus status,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        Page<JobResponse> jobs = jobService.searchJobs(query, categoryId, status, pageable);
        return ResponseEntity.ok(jobs);
    }

    /**
     * Get jobs created by the current user
     * GET /api/jobs/my-jobs
     */
    @GetMapping("/my-jobs")
    public ResponseEntity<Page<JobResponse>> getMyJobs(
            Authentication authentication,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        Page<JobResponse> jobs = jobService.getJobsByRequester(authentication.getName(), pageable);
        return ResponseEntity.ok(jobs);
    }

    /**
     * Get jobs where the current user is the tasker
     * GET /api/jobs/my-tasks
     */
    @GetMapping("/my-tasks")
    public ResponseEntity<Page<JobResponse>> getMyTasks(
            Authentication authentication,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        Page<JobResponse> jobs = jobService.getJobsByTasker(authentication.getName(), pageable);
        return ResponseEntity.ok(jobs);
    }

    /**
     * Update job status
     * PATCH /api/jobs/{id}/status
     */
    @PatchMapping("/{id}/status")
    public ResponseEntity<JobResponse> updateJobStatus(
            @PathVariable Long id,
            @RequestParam JobStatus status,
            Authentication authentication
    ) {
        JobResponse job = jobService.updateJobStatus(id, status, authentication.getName());
        return ResponseEntity.ok(job);
    }
}
