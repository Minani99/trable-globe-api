package com.travelglobe.trableglobeapi.global.web;

import com.travelglobe.trableglobeapi.global.response.ApiResponse;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * What you get when you open the deployed API in a browser.
 *
 * <p>This host serves JSON only - the user interface is a separate deployment. Without
 * this, the service root answered with a bare error, which reads like an outage when it
 * is simply the wrong address. Says what this is and where to go instead.
 */
@RestController
public class ServiceInfoController {

    /**
     * @param service    application name
     * @param apiDocs    where the endpoint reference lives
     * @param endpoints  a starting point for someone poking at the API by hand
     */
    public record ServiceInfo(
            String service,
            String description,
            String apiDocs,
            List<String> endpoints,
            Map<String, String> note) {
    }

    @GetMapping("/")
    public ApiResponse<ServiceInfo> root() {
        return ApiResponse.ok(new ServiceInfo(
                "Travel Globe API",
                "Public travel profiles with authenticated journals and conversations.",
                "https://github.com/Minani99/trable-globe-api/blob/master/docs/api.md",
                List.of(
                        "GET /api/health",
                        "GET /api/profiles/{username}",
                        "GET /api/profiles/{username}/statistics",
                        "GET /api/profiles/{username}/countries",
                        "GET /api/profiles/{username}/travels",
                        "GET /api/profiles/{username}/countries/{countryCode}/travels",
                        "GET /api/travels/{travelId}",
                        "GET /api/travels/{travelId}/social"),
                Map.of("ui", "This host serves JSON only. The web interface is deployed separately.")));
    }
}
