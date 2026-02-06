package com.viecz.server.dto.chat;

import jakarta.validation.constraints.NotNull;

/**
 * Create conversation request DTO
 */
public record ConversationRequest(
        @NotNull(message = "Job ID is required")
        Long jobId,

        @NotNull(message = "Other user ID is required")
        Long otherUserId
) {}
