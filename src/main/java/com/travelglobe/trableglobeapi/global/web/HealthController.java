package com.travelglobe.trableglobeapi.global.web;

import com.travelglobe.trableglobeapi.global.response.ApiResponse;
import java.time.Instant;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Liveness probe used by the frontend to show whether the API is reachable.
 */
@RestController
@RequestMapping("/api/health")
public class HealthController {

    /**
     * @param status     always {@code UP} when the application can serve requests
     * @param serverTime server clock, useful when debugging a stale frontend cache
     */
    public record HealthResponse(String status, Instant serverTime) {
    }

    @GetMapping
    public ApiResponse<HealthResponse> health() {
        return ApiResponse.ok(new HealthResponse("UP", Instant.now()));
    }
}
