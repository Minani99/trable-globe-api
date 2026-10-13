package com.travelglobe.trableglobeapi.travel.controller;

import com.travelglobe.trableglobeapi.auth.security.AuthenticatedRequest;
import com.travelglobe.trableglobeapi.global.response.ApiResponse;
import com.travelglobe.trableglobeapi.travel.dto.TravelDetailResponse;
import com.travelglobe.trableglobeapi.travel.service.TravelSharingService;
import com.travelglobe.trableglobeapi.travel.service.TravelSharingService.ShareLink;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.bind.annotation.*;

@RestController
public class TravelSharingController {
    private final TravelSharingService sharing;
    public TravelSharingController(TravelSharingService sharing) { this.sharing = sharing; }

    @GetMapping("/api/private/travels/{id}/share")
    public ApiResponse<ShareLink> status(HttpServletRequest request, @PathVariable Long id) {
        return ApiResponse.ok(sharing.status(AuthenticatedRequest.principal(request), id));
    }
    @PostMapping("/api/private/travels/{id}/share")
    public ApiResponse<ShareLink> enable(HttpServletRequest request, @PathVariable Long id) {
        return ApiResponse.ok(sharing.enable(AuthenticatedRequest.principal(request), id));
    }
    @DeleteMapping("/api/private/travels/{id}/share")
    public ApiResponse<Void> disable(HttpServletRequest request, @PathVariable Long id) {
        sharing.disable(AuthenticatedRequest.principal(request), id);
        return ApiResponse.ok(null);
    }
    @GetMapping("/api/shared/itineraries/{token}")
    public ApiResponse<TravelDetailResponse> shared(@PathVariable String token, HttpServletResponse response) {
        response.setHeader("Cache-Control", "no-store");
        response.setHeader("X-Robots-Tag", "noindex, nofollow");
        return ApiResponse.ok(sharing.shared(token));
    }
}
