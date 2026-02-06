package com.viecz.server.dto.chat;

import java.time.LocalDateTime;

/**
 * Conversation response DTO
 */
public record ConversationResponse(
        Long id,
        Long jobId,
        String jobTitle,
        Long posterId,
        String posterName,
        Long taskerId,
        String taskerName,
        String lastMessage,
        LocalDateTime lastMessageAt,
        Long unreadCount,
        LocalDateTime createdAt
) {}
