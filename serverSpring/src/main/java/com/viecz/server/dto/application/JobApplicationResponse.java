package com.viecz.server.dto.application;

import com.viecz.server.model.JobApplication.ApplicationStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Job application response DTO
 */
public record JobApplicationResponse(
        Long id,
        Long jobId,
        String jobTitle,
        Long taskerId,
        String taskerName,
        Double taskerRating,
        BigDecimal proposedPrice,
        String message,
        ApplicationStatus status,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}
