package com.viecz.server.controller;

import com.viecz.server.dto.chat.*;
import com.viecz.server.service.ChatService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;

/**
 * Chat REST and WebSocket controller
 */
@Controller
@RequiredArgsConstructor
@Slf4j
public class ChatController {

    private final ChatService chatService;
    private final SimpMessagingTemplate messagingTemplate;

    // ========== REST ENDPOINTS ==========

    /**
     * Create or get conversation
     * POST /api/chat/conversations
     */
    @PostMapping("/api/chat/conversations")
    @ResponseBody
    public ResponseEntity<ConversationResponse> createConversation(
            @Valid @RequestBody ConversationRequest request,
            Authentication authentication
    ) {
        ConversationResponse conversation = chatService.createConversation(request, authentication.getName());
        return ResponseEntity.status(HttpStatus.CREATED).body(conversation);
    }

    /**
     * Get all conversations for current user
     * GET /api/chat/conversations
     */
    @GetMapping("/api/chat/conversations")
    @ResponseBody
    public ResponseEntity<Page<ConversationResponse>> getConversations(
            Authentication authentication,
            @PageableDefault(size = 20, sort = "lastMessageAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        Page<ConversationResponse> conversations = chatService.getConversations(authentication.getName(), pageable);
        return ResponseEntity.ok(conversations);
    }

    /**
     * Get conversation by ID
     * GET /api/chat/conversations/{id}
     */
    @GetMapping("/api/chat/conversations/{id}")
    @ResponseBody
    public ResponseEntity<ConversationResponse> getConversation(
            @PathVariable Long id,
            Authentication authentication
    ) {
        ConversationResponse conversation = chatService.getConversationById(id, authentication.getName());
        return ResponseEntity.ok(conversation);
    }

    /**
     * Send message (REST endpoint)
     * POST /api/chat/messages
     */
    @PostMapping("/api/chat/messages")
    @ResponseBody
    public ResponseEntity<MessageResponse> sendMessage(
            @Valid @RequestBody MessageRequest request,
            Authentication authentication
    ) {
        MessageResponse message = chatService.sendMessage(request, authentication.getName());
        return ResponseEntity.status(HttpStatus.CREATED).body(message);
    }

    /**
     * Get messages in a conversation
     * GET /api/chat/messages/{conversationId}
     */
    @GetMapping("/api/chat/messages/{conversationId}")
    @ResponseBody
    public ResponseEntity<Page<MessageResponse>> getMessages(
            @PathVariable Long conversationId,
            Authentication authentication,
            @PageableDefault(size = 50, sort = "createdAt", direction = Sort.Direction.ASC) Pageable pageable
    ) {
        Page<MessageResponse> messages = chatService.getMessages(conversationId, authentication.getName(), pageable);
        return ResponseEntity.ok(messages);
    }

    /**
     * Mark messages as read
     * POST /api/chat/conversations/{id}/read
     */
    @PostMapping("/api/chat/conversations/{id}/read")
    @ResponseBody
    public ResponseEntity<Void> markAsRead(
            @PathVariable Long id,
            Authentication authentication
    ) {
        chatService.markMessagesAsRead(id, authentication.getName());
        return ResponseEntity.noContent().build();
    }

    /**
     * Get total unread count
     * GET /api/chat/unread-count
     */
    @GetMapping("/api/chat/unread-count")
    @ResponseBody
    public ResponseEntity<Long> getUnreadCount(Authentication authentication) {
        Long count = chatService.getTotalUnreadCount(authentication.getName());
        return ResponseEntity.ok(count);
    }

    // ========== WEBSOCKET ENDPOINTS ==========

    /**
     * Send message via WebSocket
     * Destination: /app/chat.send
     */
    @MessageMapping("/chat.send")
    public void sendMessageWs(@Payload MessageRequest message, Principal principal) {
        log.info("WebSocket message from {}: {}", principal.getName(), message.content());
        chatService.sendMessage(message, principal.getName());
    }

    /**
     * Typing indicator
     * Destination: /app/chat.typing
     */
    @MessageMapping("/chat.typing")
    public void handleTyping(@Payload TypingIndicator indicator, Principal principal) {
        log.info("Typing indicator from {}: {}", principal.getName(), indicator.isTyping());
        // Broadcast typing indicator to conversation
        messagingTemplate.convertAndSend(
                "/topic/conversations/" + indicator.conversationId() + "/typing",
                indicator
        );
    }

    /**
     * Mark messages as read via WebSocket
     * Destination: /app/chat.read
     */
    @MessageMapping("/chat.read")
    public void markAsReadWs(@Payload Long conversationId, Principal principal) {
        log.info("Mark as read from {}: conversation {}", principal.getName(), conversationId);
        chatService.markMessagesAsRead(conversationId, principal.getName());
    }
}
