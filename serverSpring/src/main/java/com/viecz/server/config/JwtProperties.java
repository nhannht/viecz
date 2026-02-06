package com.viecz.server.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * JWT configuration properties from application.yml
 */
@Component
@ConfigurationProperties(prefix = "app.jwt")
@Data
public class JwtProperties {

    /**
     * Secret key for signing JWT tokens
     */
    private String secret;

    /**
     * Token expiration time in milliseconds
     * Default: 86400000 (24 hours)
     */
    private Long expirationMs;
}
