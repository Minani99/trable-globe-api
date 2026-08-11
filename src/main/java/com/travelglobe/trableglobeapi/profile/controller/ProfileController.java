package com.travelglobe.trableglobeapi.profile.controller;

import com.travelglobe.trableglobeapi.global.response.ApiResponse;
import com.travelglobe.trableglobeapi.profile.dto.ProfileResponse;
import com.travelglobe.trableglobeapi.profile.dto.VisitedCountryResponse;
import com.travelglobe.trableglobeapi.profile.service.ProfileService;
import com.travelglobe.trableglobeapi.statistics.dto.TravelStatisticsResponse;
import com.travelglobe.trableglobeapi.travel.dto.TravelSummaryResponse;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Public read API for a traveller's profile.
 *
 * <p>Country-scoped trips are nested under the profile rather than exposed as
 * {@code /api/countries/{code}/travels?username=...}: the resource being addressed is
 * one member's trips, so the owner belongs in the path, not in a query parameter.
 */
@RestController
@RequestMapping("/api/profiles/{username}")
public class ProfileController {

    private final ProfileService profileService;

    public ProfileController(ProfileService profileService) {
        this.profileService = profileService;
    }

    @GetMapping
    public ApiResponse<ProfileResponse> getProfile(@PathVariable String username) {
        return ApiResponse.ok(profileService.getProfile(username));
    }

    @GetMapping("/statistics")
    public ApiResponse<TravelStatisticsResponse> getStatistics(@PathVariable String username) {
        return ApiResponse.ok(profileService.getStatistics(username));
    }

    @GetMapping("/countries")
    public ApiResponse<List<VisitedCountryResponse>> getVisitedCountries(@PathVariable String username) {
        return ApiResponse.ok(profileService.getVisitedCountries(username));
    }

    @GetMapping("/travels")
    public ApiResponse<List<TravelSummaryResponse>> getTravels(@PathVariable String username) {
        return ApiResponse.ok(profileService.getTravels(username));
    }

    @GetMapping("/countries/{countryCode}/travels")
    public ApiResponse<List<TravelSummaryResponse>> getTravelsByCountry(@PathVariable String username,
                                                                        @PathVariable String countryCode) {
        return ApiResponse.ok(profileService.getTravelsByCountry(username, countryCode));
    }
}
