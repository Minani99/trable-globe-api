package com.travelglobe.trableglobeapi.travel.controller;

import com.travelglobe.trableglobeapi.global.response.ApiResponse;
import com.travelglobe.trableglobeapi.travel.dto.TravelDetailResponse;
import com.travelglobe.trableglobeapi.travel.service.TravelQueryService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * A single trip, addressable independently of whose profile it belongs to.
 */
@RestController
@RequestMapping("/api/travels")
public class TravelController {

    private final TravelQueryService travelQueryService;

    public TravelController(TravelQueryService travelQueryService) {
        this.travelQueryService = travelQueryService;
    }

    @GetMapping("/{travelId}")
    public ApiResponse<TravelDetailResponse> getTravel(@PathVariable Long travelId) {
        return ApiResponse.ok(travelQueryService.getPublicTravelDetail(travelId));
    }
}
