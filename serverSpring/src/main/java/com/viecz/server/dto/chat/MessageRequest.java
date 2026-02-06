package com.viecz.server.dto.chat;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Message send request DTO
 */
public record MessageRequest(
        @NotNull(message = "Conversation ID is required")
        Long conversationId,

        @NotBlank(message = "Message content is required")
        @Size(max = 5000, message = "Message must be less than 5000 characters")
        String content
) {}
