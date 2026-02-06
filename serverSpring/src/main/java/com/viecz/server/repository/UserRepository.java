package com.viecz.server.repository;

import com.viecz.server.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Repository interface for User entity.
 * Spring Data JPA automatically implements this interface.
 */
@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    /**
     * Find user by email
     */
    Optional<User> findByEmail(String email);

    /**
     * Check if email exists
     */
    boolean existsByEmail(String email);

    /**
     * Find all taskers (users who can perform jobs)
     */
    java.util.List<User> findByIsTaskerTrue();

    /**
     * Find users by university
     */
    java.util.List<User> findByUniversity(String university);
}
