package com.travelglobe.trableglobeapi.social.controller;

import com.travelglobe.trableglobeapi.auth.security.AuthenticatedRequest;
import com.travelglobe.trableglobeapi.global.response.ApiResponse;
import com.travelglobe.trableglobeapi.social.dto.ActivityEventResponse;
import com.travelglobe.trableglobeapi.social.service.ActivityService;
import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/private/activity")
public class ActivityController {

    private final ActivityService activityService;

    public ActivityController(ActivityService activityService) {
        this.activityService = activityService;
    }

    @GetMapping
    public ApiResponse<List<ActivityEventResponse>> recent(
            HttpServletRequest request,
            @RequestParam(defaultValue = "12") int limit) {
        return ApiResponse.ok(activityService.recent(
                AuthenticatedRequest.principal(request), limit));
    }
}
