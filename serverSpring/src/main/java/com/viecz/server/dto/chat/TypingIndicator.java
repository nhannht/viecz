package com.viecz.server.dto.chat;

/**
 * Typing indicator for real-time updates
 */
public record TypingIndicator(
        Long conversationId,
        Long userId,
        String userName,
        Boolean isTyping
) {}
