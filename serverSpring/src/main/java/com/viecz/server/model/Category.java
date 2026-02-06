package com.viecz.server.model;

import jakarta.persistence.*;
import lombok.*;

/**
 * Category entity representing job categories in the Viecz platform.
 * Categories help organize and filter jobs.
 */
@Entity
@Table(name = "categories")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Category {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false, length = 50)
    private String name;

    @Column(name = "name_vi", nullable = false, length = 50)
    private String nameVi;

    @Column(length = 50)
    private String icon;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    // Relationships
    // @OneToMany(mappedBy = "category")
    // private List<Job> jobs;
}
