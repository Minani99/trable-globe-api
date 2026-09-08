package com.travelglobe.trableglobeapi.global.web;

import com.travelglobe.trableglobeapi.global.response.ApiResponse;
import java.time.Instant;
import org.springframework.beans.factory.annotation.Value;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Runtime probes used by the hosting platform and external monitors.
 */
@RestController
@RequestMapping("/api/health")
public class HealthController {

    private static final Logger log = LoggerFactory.getLogger(HealthController.class);

    private final JdbcTemplate jdbcTemplate;
    private final String commit;
    private final String environment;

    public HealthController(
            JdbcTemplate jdbcTemplate,
            @Value("${travel-globe.build.commit:local}") String commit,
            @Value("${travel-globe.build.environment:local}") String environment) {
        this.jdbcTemplate = jdbcTemplate;
        this.commit = commit;
        this.environment = environment;
    }

    /**
     * @param status     overall readiness
     * @param database   database dependency status
     * @param serverTime server clock, useful when debugging a stale frontend cache
     */
    public record HealthResponse(
            String status,
            String database,
            Instant serverTime,
            String commit,
            String environment) {
    }

    /**
     * Readiness probe. A deployment only receives traffic when both the application
     * and its database can serve requests.
     */
    @GetMapping
    public ResponseEntity<ApiResponse<HealthResponse>> readiness() {
        Instant now = Instant.now();
        try {
            jdbcTemplate.queryForObject("select 1", Integer.class);
            return ResponseEntity.ok(ApiResponse.ok(new HealthResponse("UP", "UP", now, commit, environment)));
        } catch (RuntimeException exception) {
            log.error("Database readiness check failed", exception);
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(ApiResponse.ok(new HealthResponse("DOWN", "DOWN", now, commit, environment)));
        }
    }

    /**
     * Liveness probe deliberately avoids downstream dependencies. It distinguishes a
     * crashed process from a temporary database incident without restarting healthy JVMs.
     */
    @GetMapping("/live")
    public ApiResponse<HealthResponse> liveness() {
        return ApiResponse.ok(new HealthResponse("UP", "NOT_CHECKED", Instant.now(), commit, environment));
    }
}
