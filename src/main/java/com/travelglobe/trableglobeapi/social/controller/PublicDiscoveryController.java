package com.travelglobe.trableglobeapi.social.controller;

import com.travelglobe.trableglobeapi.global.response.ApiResponse;
import com.travelglobe.trableglobeapi.social.dto.MemberConnectionResponse;
import com.travelglobe.trableglobeapi.social.dto.MemberDiscoveryResponse;
import com.travelglobe.trableglobeapi.social.service.MemberDiscoveryService;
import com.travelglobe.trableglobeapi.social.service.CourseDiscoveryService;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/discovery")
public class PublicDiscoveryController {

    private final MemberDiscoveryService discoveryService;

    private final CourseDiscoveryService courses;

    public PublicDiscoveryController(MemberDiscoveryService discoveryService, CourseDiscoveryService courses) {
        this.courses = courses;
        this.discoveryService = discoveryService;
    }

    @GetMapping("/courses")
    public ApiResponse<List<CourseDiscoveryService.Course>> courses(
            @RequestParam(defaultValue = "") String destination) {
        return ApiResponse.ok(courses.find(destination, -1L));
    }

    @GetMapping("/search")
    public ApiResponse<List<MemberDiscoveryResponse>> search(
            @RequestParam String query,
            @RequestParam(defaultValue = "12") int limit) {
        return ApiResponse.ok(discoveryService.publicSearch(query, limit));
    }

    @GetMapping("/recommendations")
    public ApiResponse<List<MemberDiscoveryResponse>> recommendations(
            @RequestParam(defaultValue = "8") int limit) {
        return ApiResponse.ok(discoveryService.publicRecommendations(limit));
    }

    @GetMapping("/profiles/{username}/followers")
    public ApiResponse<List<MemberConnectionResponse>> followers(
            @PathVariable String username,
            @RequestParam(defaultValue = "24") int limit) {
        return ApiResponse.ok(discoveryService.publicFollowers(username, limit));
    }

    @GetMapping("/profiles/{username}/following")
    public ApiResponse<List<MemberConnectionResponse>> following(
            @PathVariable String username,
            @RequestParam(defaultValue = "24") int limit) {
        return ApiResponse.ok(discoveryService.publicFollowing(username, limit));
    }
}
