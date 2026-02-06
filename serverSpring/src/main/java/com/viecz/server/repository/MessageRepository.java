package com.viecz.server.repository;

import com.viecz.server.model.Message;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository interface for Message entity.
 */
@Repository
public interface MessageRepository extends JpaRepository<Message, Long> {

    /**
     * Find messages in a conversation
     */
    List<Message> findByConversationIdOrderByCreatedAtAsc(Long conversationId);

    /**
     * Find messages by sender
     */
    List<Message> findBySenderId(Long senderId);

    /**
     * Find unread messages in a conversation for a user
     */
    @Query("SELECT m FROM Message m WHERE m.conversationId = :conversationId AND m.senderId != :userId AND m.isRead = false")
    List<Message> findUnreadMessages(@Param("conversationId") Long conversationId, @Param("userId") Long userId);

    /**
     * Count unread messages in a conversation
     */
    @Query("SELECT COUNT(m) FROM Message m WHERE m.conversationId = :conversationId AND m.senderId != :userId AND m.isRead = false")
    long countUnreadMessages(@Param("conversationId") Long conversationId, @Param("userId") Long userId);

    /**
     * Mark all messages in conversation as read
     */
    @Modifying
    @Query("UPDATE Message m SET m.isRead = true, m.readAt = CURRENT_TIMESTAMP WHERE m.conversationId = :conversationId AND m.senderId != :userId AND m.isRead = false")
    void markAllAsRead(@Param("conversationId") Long conversationId, @Param("userId") Long userId);

    /**
     * Find messages with pagination
     */
    Page<Message> findByConversationIdOrderByCreatedAtAsc(Long conversationId, Pageable pageable);

    /**
     * Count total unread messages for a user across all conversations
     */
    @Query("SELECT COUNT(m) FROM Message m JOIN m.conversation c WHERE (c.posterId = :userId OR c.taskerId = :userId) AND m.senderId != :userId AND m.isRead = false")
    Long countTotalUnreadMessages(@Param("userId") Long userId);
}
