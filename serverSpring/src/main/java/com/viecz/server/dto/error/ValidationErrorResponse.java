package com.viecz.server.dto.error;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * Validation error response with field-specific errors
 */
public record ValidationErrorResponse(
        LocalDateTime timestamp,
        int status,
        String error,
        String message,
        String path,
        Map<String, String> fieldErrors
) {
    public ValidationErrorResponse(int status, String error, String message, String path, Map<String, String> fieldErrors) {
        this(LocalDateTime.now(), status, error, message, path, fieldErrors);
    }
}
