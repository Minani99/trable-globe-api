package com.travelglobe.trableglobeapi.global.config;

import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Origins allowed to call the API from a browser.
 *
 * <p>Configured per environment ({@code travel-globe.cors.allowed-origins}) rather than
 * wildcarded, so a deployed API only answers its own frontend.
 *
 * @param allowedOrigins exact origins, e.g. {@code https://travelglobe.example}
 */
@ConfigurationProperties(prefix = "travel-globe.cors")
public record CorsProperties(List<String> allowedOrigins) {

    public CorsProperties {
        allowedOrigins = allowedOrigins == null ? List.of() : List.copyOf(allowedOrigins);
    }
}
