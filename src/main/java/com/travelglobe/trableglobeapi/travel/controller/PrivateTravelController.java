package com.travelglobe.trableglobeapi.travel.controller;

import com.travelglobe.trableglobeapi.auth.security.MemberPrincipal;
import com.travelglobe.trableglobeapi.auth.security.AuthenticatedRequest;
import com.travelglobe.trableglobeapi.global.response.ApiResponse;
import com.travelglobe.trableglobeapi.travel.dto.OwnedTravelSummaryResponse;
import com.travelglobe.trableglobeapi.travel.dto.TravelDetailResponse;
import com.travelglobe.trableglobeapi.travel.dto.write.TravelWriteRequest;
import com.travelglobe.trableglobeapi.travel.service.TravelCommandService;
import jakarta.validation.Valid;
import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/private/travels")
public class PrivateTravelController {

    private final TravelCommandService travelCommandService;

    public PrivateTravelController(TravelCommandService travelCommandService) {
        this.travelCommandService = travelCommandService;
    }

    @GetMapping
    public ApiResponse<List<OwnedTravelSummaryResponse>> findMine(
            HttpServletRequest request) {
        MemberPrincipal principal = AuthenticatedRequest.principal(request);
        return ApiResponse.ok(travelCommandService.findMine(principal));
    }

    @GetMapping("/{travelId}")
    public ApiResponse<TravelDetailResponse> getMine(
            HttpServletRequest request,
            @PathVariable Long travelId) {
        MemberPrincipal principal = AuthenticatedRequest.principal(request);
        return ApiResponse.ok(travelCommandService.getMine(principal, travelId));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<TravelDetailResponse> create(
            HttpServletRequest servletRequest,
            @Valid @RequestBody TravelWriteRequest request) {
        MemberPrincipal principal = AuthenticatedRequest.principal(servletRequest);
        return ApiResponse.ok(travelCommandService.create(principal, request), "여행을 만들었습니다.");
    }

    @PutMapping("/{travelId}")
    public ApiResponse<TravelDetailResponse> update(
            HttpServletRequest servletRequest,
            @PathVariable Long travelId,
            @Valid @RequestBody TravelWriteRequest request) {
        MemberPrincipal principal = AuthenticatedRequest.principal(servletRequest);
        return ApiResponse.ok(travelCommandService.update(principal, travelId, request), "여행을 저장했습니다.");
    }

    @DeleteMapping("/{travelId}")
    public ApiResponse<Void> delete(
            HttpServletRequest request,
            @PathVariable Long travelId) {
        MemberPrincipal principal = AuthenticatedRequest.principal(request);
        travelCommandService.delete(principal, travelId);
        return ApiResponse.ok(null, "여행을 삭제했습니다.");
    }
}
