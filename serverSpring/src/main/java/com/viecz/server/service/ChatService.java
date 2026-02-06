package com.viecz.server.service;

import com.viecz.server.dto.chat.ConversationRequest;
import com.viecz.server.dto.chat.ConversationResponse;
import com.viecz.server.dto.chat.MessageRequest;
import com.viecz.server.dto.chat.MessageResponse;
import com.viecz.server.mapper.ConversationMapper;
import com.viecz.server.mapper.MessageMapper;
import com.viecz.server.model.Conversation;
import com.viecz.server.model.Job;
import com.viecz.server.model.Message;
import com.viecz.server.model.User;
import com.viecz.server.repository.ConversationRepository;
import com.viecz.server.repository.JobRepository;
import com.viecz.server.repository.MessageRepository;
import com.viecz.server.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * Chat service for managing conversations and messages
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ChatService {

    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final JobRepository jobRepository;
    private final UserRepository userRepository;
    private final ConversationMapper conversationMapper;
    private final MessageMapper messageMapper;
    private final SimpMessagingTemplate messagingTemplate;

    /**
     * Create or get existing conversation
     */
    @Transactional
    public ConversationResponse createConversation(ConversationRequest request, String currentUserEmail) {
        User currentUser = userRepository.findByEmail(currentUserEmail)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        User otherUser = userRepository.findById(request.otherUserId())
                .orElseThrow(() -> new IllegalArgumentException("Other user not found with id: " + request.otherUserId()));

        Job job = jobRepository.findById(request.jobId())
                .orElseThrow(() -> new IllegalArgumentException("Job not found with id: " + request.jobId()));

        // Determine poster and tasker roles
        Long posterId, taskerId;
        if (job.getRequester().getId().equals(currentUser.getId())) {
            posterId = currentUser.getId();
            taskerId = otherUser.getId();
        } else {
            posterId = otherUser.getId();
            taskerId = currentUser.getId();
        }

        // Check if conversation already exists
        Conversation conversation = conversationRepository
                .findByTaskIdAndPosterIdAndTaskerId(job.getId(), posterId, taskerId)
                .orElseGet(() -> {
                    // Create new conversation
                    Conversation newConv = Conversation.builder()
                            .taskId(job.getId())
                            .posterId(posterId)
                            .taskerId(taskerId)
                            .build();
                    return conversationRepository.save(newConv);
                });

        ConversationResponse response = conversationMapper.toResponse(conversation);
        // Calculate unread count
        Long unreadCount = messageRepository.countUnreadMessages(conversation.getId(), currentUser.getId());
        return new ConversationResponse(
                response.id(),
                response.jobId(),
                response.jobTitle(),
                response.posterId(),
                response.posterName(),
                response.taskerId(),
                response.taskerName(),
                response.lastMessage(),
                response.lastMessageAt(),
                unreadCount,
                response.createdAt()
        );
    }

    /**
     * Get all conversations for current user
     */
    @Transactional(readOnly = true)
    public Page<ConversationResponse> getConversations(String userEmail, Pageable pageable) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        Page<Conversation> conversations = conversationRepository.findByUserIdWithPagination(user.getId(), pageable);
        return conversations.map(conv -> {
            ConversationResponse response = conversationMapper.toResponse(conv);
            Long unreadCount = messageRepository.countUnreadMessages(conv.getId(), user.getId());
            return new ConversationResponse(
                    response.id(),
                    response.jobId(),
                    response.jobTitle(),
                    response.posterId(),
                    response.posterName(),
                    response.taskerId(),
                    response.taskerName(),
                    response.lastMessage(),
                    response.lastMessageAt(),
                    unreadCount,
                    response.createdAt()
            );
        });
    }

    /**
     * Get conversation by ID
     */
    @Transactional(readOnly = true)
    public ConversationResponse getConversationById(Long conversationId, String userEmail) {
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new IllegalArgumentException("Conversation not found with id: " + conversationId));

        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        // Verify user is part of the conversation
        if (!conversation.getPosterId().equals(user.getId()) && !conversation.getTaskerId().equals(user.getId())) {
            throw new IllegalArgumentException("You are not authorized to view this conversation");
        }

        ConversationResponse response = conversationMapper.toResponse(conversation);
        Long unreadCount = messageRepository.countUnreadMessages(conversation.getId(), user.getId());
        return new ConversationResponse(
                response.id(),
                response.jobId(),
                response.jobTitle(),
                response.posterId(),
                response.posterName(),
                response.taskerId(),
                response.taskerName(),
                response.lastMessage(),
                response.lastMessageAt(),
                unreadCount,
                response.createdAt()
        );
    }

    /**
     * Send a message
     */
    @Transactional
    public MessageResponse sendMessage(MessageRequest request, String senderEmail) {
        User sender = userRepository.findByEmail(senderEmail)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        Conversation conversation = conversationRepository.findById(request.conversationId())
                .orElseThrow(() -> new IllegalArgumentException("Conversation not found with id: " + request.conversationId()));

        // Verify user is part of the conversation
        if (!conversation.getPosterId().equals(sender.getId()) && !conversation.getTaskerId().equals(sender.getId())) {
            throw new IllegalArgumentException("You are not authorized to send messages in this conversation");
        }

        // Create message
        Message message = Message.builder()
                .conversationId(conversation.getId())
                .senderId(sender.getId())
                .content(request.content())
                .isRead(false)
                .build();

        message = messageRepository.save(message);

        // Update conversation's last message
        conversation.setLastMessage(request.content());
        conversation.setLastMessageAt(LocalDateTime.now());
        conversationRepository.save(conversation);

        MessageResponse response = messageMapper.toResponse(message);

        // Send real-time message via WebSocket
        messagingTemplate.convertAndSend("/topic/conversations/" + conversation.getId(), response);

        // Send notification to the other user
        Long recipientId = conversation.getPosterId().equals(sender.getId())
                ? conversation.getTaskerId()
                : conversation.getPosterId();
        messagingTemplate.convertAndSendToUser(
                recipientId.toString(),
                "/queue/notifications",
                response
        );

        log.info("Message sent in conversation {}: {}", conversation.getId(), message.getId());
        return response;
    }

    /**
     * Get messages in a conversation
     */
    @Transactional(readOnly = true)
    public Page<MessageResponse> getMessages(Long conversationId, String userEmail, Pageable pageable) {
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new IllegalArgumentException("Conversation not found with id: " + conversationId));

        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        // Verify user is part of the conversation
        if (!conversation.getPosterId().equals(user.getId()) && !conversation.getTaskerId().equals(user.getId())) {
            throw new IllegalArgumentException("You are not authorized to view messages in this conversation");
        }

        Page<Message> messages = messageRepository.findByConversationIdOrderByCreatedAtAsc(conversationId, pageable);
        return messages.map(messageMapper::toResponse);
    }

    /**
     * Mark all messages in a conversation as read
     */
    @Transactional
    public void markMessagesAsRead(Long conversationId, String userEmail) {
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new IllegalArgumentException("Conversation not found with id: " + conversationId));

        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        // Verify user is part of the conversation
        if (!conversation.getPosterId().equals(user.getId()) && !conversation.getTaskerId().equals(user.getId())) {
            throw new IllegalArgumentException("You are not authorized to mark messages as read in this conversation");
        }

        messageRepository.markAllAsRead(conversationId, user.getId());
        log.info("Messages marked as read in conversation {} for user {}", conversationId, user.getId());
    }

    /**
     * Get total unread message count for user
     */
    @Transactional(readOnly = true)
    public Long getTotalUnreadCount(String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        return messageRepository.countTotalUnreadMessages(user.getId());
    }
}
