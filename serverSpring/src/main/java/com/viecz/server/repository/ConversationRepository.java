package com.viecz.server.repository;

import com.viecz.server.model.Conversation;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository interface for Conversation entity.
 */
@Repository
public interface ConversationRepository extends JpaRepository<Conversation, Long> {

    /**
     * Find conversation by task
     */
    Optional<Conversation> findByTaskId(Long taskId);

    /**
     * Find conversations for a user (either as poster or tasker)
     */
    @Query("SELECT c FROM Conversation c WHERE c.posterId = :userId OR c.taskerId = :userId ORDER BY c.lastMessageAt DESC")
    List<Conversation> findByUserId(@Param("userId") Long userId);

    /**
     * Find conversations where user is poster
     */
    List<Conversation> findByPosterIdOrderByLastMessageAtDesc(Long posterId);

    /**
     * Find conversations where user is tasker
     */
    List<Conversation> findByTaskerIdOrderByLastMessageAtDesc(Long taskerId);

    /**
     * Check if conversation exists for task
     */
    boolean existsByTaskId(Long taskId);

    /**
     * Find conversation between two users for a task
     */
    Optional<Conversation> findByTaskIdAndPosterIdAndTaskerId(Long taskId, Long posterId, Long taskerId);

    /**
     * Find conversations for a user with pagination
     */
    @Query("SELECT c FROM Conversation c WHERE c.posterId = :userId OR c.taskerId = :userId ORDER BY c.lastMessageAt DESC NULLS LAST")
    Page<Conversation> findByUserIdWithPagination(@Param("userId") Long userId, Pageable pageable);
}
