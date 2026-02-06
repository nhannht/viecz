package com.viecz.server.repository;

import com.viecz.server.model.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository interface for Category entity.
 */
@Repository
public interface CategoryRepository extends JpaRepository<Category, Integer> {

    /**
     * Find all active categories
     */
    List<Category> findByIsActiveTrue();

    /**
     * Find category by name
     */
    Category findByName(String name);
}
