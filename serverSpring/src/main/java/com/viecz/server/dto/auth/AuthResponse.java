package com.viecz.server.dto.auth;

/**
 * Authentication response with JWT token
 */
public record AuthResponse(
        String token,
        String type,
        Long userId,
        String email,
        String name
) {
    public AuthResponse(String token, Long userId, String email, String name) {
        this(token, "Bearer", userId, email, name);
    }
}
