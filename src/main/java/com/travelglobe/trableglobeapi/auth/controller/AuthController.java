package com.travelglobe.trableglobeapi.auth.controller;

import com.travelglobe.trableglobeapi.auth.dto.AuthMemberResponse;
import com.travelglobe.trableglobeapi.auth.dto.AuthSessionResponse;
import com.travelglobe.trableglobeapi.auth.dto.LoginRequest;
import com.travelglobe.trableglobeapi.auth.dto.RegisterRequest;
import com.travelglobe.trableglobeapi.auth.dto.UpdateProfileRequest;
import com.travelglobe.trableglobeapi.auth.security.MemberPrincipal;
import com.travelglobe.trableglobeapi.auth.security.AuthenticatedRequest;
import com.travelglobe.trableglobeapi.auth.service.AuthService;
import com.travelglobe.trableglobeapi.auth.service.AuthSessionService;
import com.travelglobe.trableglobeapi.global.response.ApiResponse;
import jakarta.validation.Valid;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final AuthSessionService authSessionService;

    public AuthController(AuthService authService, AuthSessionService authSessionService) {
        this.authService = authService;
        this.authSessionService = authSessionService;
    }

    @PostMapping("/register")
    public ApiResponse<AuthSessionResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ApiResponse.ok(authService.register(request), "계정을 만들었습니다.");
    }

    @PostMapping("/login")
    public ApiResponse<AuthSessionResponse> login(@Valid @RequestBody LoginRequest request) {
        return ApiResponse.ok(authService.login(request), "로그인했습니다.");
    }

    @PostMapping("/logout")
    public ApiResponse<Void> logout(HttpServletRequest request) {
        MemberPrincipal principal = AuthenticatedRequest.principal(request);
        authSessionService.revoke(principal);
        return ApiResponse.ok(null, "로그아웃했습니다.");
    }

    @GetMapping("/me")
    public ApiResponse<AuthMemberResponse> me(HttpServletRequest request) {
        MemberPrincipal principal = AuthenticatedRequest.principal(request);
        return ApiResponse.ok(authService.getCurrentMember(principal));
    }

    @PatchMapping("/profile")
    public ApiResponse<AuthMemberResponse> updateProfile(
            HttpServletRequest servletRequest,
            @Valid @RequestBody UpdateProfileRequest request) {
        MemberPrincipal principal = AuthenticatedRequest.principal(servletRequest);
        return ApiResponse.ok(authService.updateProfile(principal, request), "프로필을 저장했습니다.");
    }
}
