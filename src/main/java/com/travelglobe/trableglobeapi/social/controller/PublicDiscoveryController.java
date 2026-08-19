package com.travelglobe.trableglobeapi.social.controller;

import com.travelglobe.trableglobeapi.global.response.ApiResponse;
import com.travelglobe.trableglobeapi.social.dto.MemberDiscoveryResponse;
import com.travelglobe.trableglobeapi.social.service.MemberDiscoveryService;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/discovery")
public class PublicDiscoveryController {

    private final MemberDiscoveryService discoveryService;

    public PublicDiscoveryController(MemberDiscoveryService discoveryService) {
        this.discoveryService = discoveryService;
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
}
