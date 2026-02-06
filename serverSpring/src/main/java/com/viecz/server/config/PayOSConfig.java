package com.viecz.server.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import vn.payos.PayOS;

/**
 * PayOS configuration
 */
@Configuration
@ConfigurationProperties(prefix = "app.payos")
@Data
public class PayOSConfig {

    private String clientId;
    private String apiKey;
    private String checksumKey;

    /**
     * Create PayOS client bean
     */
    @Bean
    public PayOS payOS() {
        return new PayOS(clientId, apiKey, checksumKey);
    }
}
