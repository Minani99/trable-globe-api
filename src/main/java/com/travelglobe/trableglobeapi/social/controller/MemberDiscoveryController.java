package com.travelglobe.trableglobeapi.social.controller;

import com.travelglobe.trableglobeapi.auth.security.AuthenticatedRequest;
import com.travelglobe.trableglobeapi.auth.security.MemberPrincipal;
import com.travelglobe.trableglobeapi.global.response.ApiResponse;
import com.travelglobe.trableglobeapi.social.dto.FollowStatusResponse;
import com.travelglobe.trableglobeapi.social.dto.MemberDiscoveryResponse;
import com.travelglobe.trableglobeapi.social.service.MemberDiscoveryService;
import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/private/discovery")
public class MemberDiscoveryController {

    private final MemberDiscoveryService discoveryService;

    public MemberDiscoveryController(MemberDiscoveryService discoveryService) {
        this.discoveryService = discoveryService;
    }

    @GetMapping("/search")
    public ApiResponse<List<MemberDiscoveryResponse>> search(
            HttpServletRequest request,
            @RequestParam String query,
            @RequestParam(defaultValue = "12") int limit) {
        return ApiResponse.ok(discoveryService.search(principal(request), query, limit));
    }

    @GetMapping("/recommendations")
    public ApiResponse<List<MemberDiscoveryResponse>> recommendations(
            HttpServletRequest request,
            @RequestParam(defaultValue = "8") int limit) {
        return ApiResponse.ok(discoveryService.recommendations(principal(request), limit));
    }

    @GetMapping("/profiles/{username}")
    public ApiResponse<FollowStatusResponse> status(
            HttpServletRequest request, @PathVariable String username) {
        return ApiResponse.ok(discoveryService.status(principal(request), username));
    }

    @PostMapping("/profiles/{username}/follow")
    public ApiResponse<FollowStatusResponse> follow(
            HttpServletRequest request, @PathVariable String username) {
        return ApiResponse.ok(discoveryService.follow(principal(request), username), "팔로우했습니다.");
    }

    @DeleteMapping("/profiles/{username}/follow")
    public ApiResponse<FollowStatusResponse> unfollow(
            HttpServletRequest request, @PathVariable String username) {
        return ApiResponse.ok(discoveryService.unfollow(principal(request), username), "팔로우를 취소했습니다.");
    }

    private static MemberPrincipal principal(HttpServletRequest request) {
        return AuthenticatedRequest.principal(request);
    }
}
