package com.viecz.server.dto.job;

import com.viecz.server.model.Job.JobStatus;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Job creation/update request DTO
 */
public record JobRequest(
        @NotBlank(message = "Title is required")
        @Size(max = 200, message = "Title must be less than 200 characters")
        String title,

        @NotBlank(message = "Description is required")
        String description,

        @NotNull(message = "Price is required")
        @DecimalMin(value = "0.0", inclusive = false, message = "Price must be greater than 0")
        BigDecimal price,

        @NotBlank(message = "Location is required")
        @Size(max = 200, message = "Location must be less than 200 characters")
        String location,

        @NotNull(message = "Category ID is required")
        Integer categoryId,

        LocalDateTime deadline,

        List<String> images
) {}
