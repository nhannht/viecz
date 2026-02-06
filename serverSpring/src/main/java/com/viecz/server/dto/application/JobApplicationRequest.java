package com.viecz.server.dto.application;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

/**
 * Job application request DTO
 */
public record JobApplicationRequest(
        @NotNull(message = "Job ID is required")
        Long jobId,

        @NotNull(message = "Proposed price is required")
        @DecimalMin(value = "0.0", inclusive = false, message = "Proposed price must be greater than 0")
        BigDecimal proposedPrice,

        @Size(max = 1000, message = "Message must be less than 1000 characters")
        String message
) {}
