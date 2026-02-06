package com.viecz.server.dto.category;

/**
 * Category response DTO
 */
public record CategoryResponse(
        Integer id,
        String nameEn,
        String nameVi,
        String icon,
        Boolean isActive
) {}
