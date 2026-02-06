package com.viecz.server.dto.chat;

import java.time.LocalDateTime;

/**
 * Message response DTO
 */
public record MessageResponse(
        Long id,
        Long conversationId,
        Long senderId,
        String senderName,
        String content,
        Boolean isRead,
        LocalDateTime readAt,
        LocalDateTime createdAt
) {}
