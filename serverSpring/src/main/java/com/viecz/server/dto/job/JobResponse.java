package com.viecz.server.dto.job;

import com.viecz.server.dto.category.CategoryResponse;
import com.viecz.server.model.Job.JobStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Job response DTO
 */
public record JobResponse(
        Long id,
        String title,
        String description,
        BigDecimal price,
        String location,
        JobStatus status,
        LocalDateTime deadline,
        List<String> images,
        CategoryResponse category,
        Long requesterId,
        String requesterName,
        Long taskerId,
        String taskerName,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}
