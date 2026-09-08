package com.travelglobe.trableglobeapi.profile.controller;

import com.travelglobe.trableglobeapi.auth.security.AuthenticatedRequest;
import com.travelglobe.trableglobeapi.global.response.ApiResponse;
import com.travelglobe.trableglobeapi.profile.dto.ProfileRecapPreferenceResponse;
import com.travelglobe.trableglobeapi.profile.dto.UpdateProfileRecapPreferenceRequest;
import com.travelglobe.trableglobeapi.profile.service.ProfileRecapPreferenceService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ProfileRecapPreferenceController {

    private final ProfileRecapPreferenceService preferenceService;

    public ProfileRecapPreferenceController(ProfileRecapPreferenceService preferenceService) {
        this.preferenceService = preferenceService;
    }

    @GetMapping("/api/profiles/{username}/recaps")
    public ApiResponse<List<ProfileRecapPreferenceResponse>> findPublic(
            @PathVariable String username) {
        return ApiResponse.ok(preferenceService.findPublic(username));
    }

    @PutMapping("/api/private/recaps/{year}")
    public ApiResponse<ProfileRecapPreferenceResponse> update(
            HttpServletRequest servletRequest,
            @PathVariable int year,
            @Valid @RequestBody UpdateProfileRecapPreferenceRequest request) {
        return ApiResponse.ok(preferenceService.update(
                AuthenticatedRequest.principal(servletRequest), year, request), "리캡을 저장했습니다.");
    }

    @DeleteMapping("/api/private/recaps/{year}")
    public ApiResponse<Void> delete(
            HttpServletRequest servletRequest,
            @PathVariable int year) {
        preferenceService.delete(AuthenticatedRequest.principal(servletRequest), year);
        return ApiResponse.ok(null, "기본 리캡으로 되돌렸습니다.");
    }
}
