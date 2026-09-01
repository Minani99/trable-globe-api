package com.travelglobe.trableglobeapi.auth.controller;

import com.travelglobe.trableglobeapi.auth.dto.AuthMemberResponse;
import com.travelglobe.trableglobeapi.auth.dto.AuthSessionResponse;
import com.travelglobe.trableglobeapi.auth.dto.AccountActionResponse;
import com.travelglobe.trableglobeapi.auth.dto.ChangePasswordRequest;
import com.travelglobe.trableglobeapi.auth.dto.DeleteAccountRequest;
import com.travelglobe.trableglobeapi.auth.dto.ForgotPasswordRequest;
import com.travelglobe.trableglobeapi.auth.dto.LoginRequest;
import com.travelglobe.trableglobeapi.auth.dto.RegisterRequest;
import com.travelglobe.trableglobeapi.auth.dto.ResetPasswordRequest;
import com.travelglobe.trableglobeapi.auth.dto.TokenRequest;
import com.travelglobe.trableglobeapi.auth.dto.UpdateProfileRequest;
import com.travelglobe.trableglobeapi.auth.dto.UpdateAccountRequest;
import com.travelglobe.trableglobeapi.auth.dto.UsernameAvailabilityResponse;
import com.travelglobe.trableglobeapi.auth.security.MemberPrincipal;
import com.travelglobe.trableglobeapi.auth.security.AuthenticatedRequest;
import com.travelglobe.trableglobeapi.auth.service.AuthService;
import com.travelglobe.trableglobeapi.auth.service.AuthSessionService;
import com.travelglobe.trableglobeapi.global.response.ApiResponse;
import jakarta.validation.Valid;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
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

    @GetMapping("/username-availability")
    public ApiResponse<UsernameAvailabilityResponse> usernameAvailability(
            @RequestParam(defaultValue = "") String username) {
        return ApiResponse.ok(authService.usernameAvailability(username));
    }

    @PatchMapping("/account")
    public ApiResponse<AuthMemberResponse> updateAccount(
            HttpServletRequest servletRequest,
            @Valid @RequestBody UpdateAccountRequest request) {
        MemberPrincipal principal = AuthenticatedRequest.principal(servletRequest);
        return ApiResponse.ok(authService.updateAccount(principal, request), "가입 정보를 저장했습니다.");
    }

    @PostMapping("/email-verification")
    public ApiResponse<AccountActionResponse> requestEmailVerification(HttpServletRequest request) {
        MemberPrincipal principal = AuthenticatedRequest.principal(request);
        AccountActionResponse response = authService.requestEmailVerification(principal);
        return ApiResponse.ok(response, response.message());
    }

    @PostMapping("/email-verification/confirm")
    public ApiResponse<AuthMemberResponse> confirmEmail(@Valid @RequestBody TokenRequest request) {
        return ApiResponse.ok(authService.confirmEmail(request), "이메일 인증을 마쳤습니다.");
    }

    @PostMapping("/password/forgot")
    public ApiResponse<AccountActionResponse> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        AccountActionResponse response = authService.requestPasswordReset(request);
        return ApiResponse.ok(response, response.message());
    }

    @PostMapping("/password/reset")
    public ApiResponse<Void> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request);
        return ApiResponse.ok(null, "새 비밀번호를 저장했습니다. 다시 로그인해 주세요.");
    }

    @PatchMapping("/password")
    public ApiResponse<Void> changePassword(
            HttpServletRequest servletRequest,
            @Valid @RequestBody ChangePasswordRequest request) {
        MemberPrincipal principal = AuthenticatedRequest.principal(servletRequest);
        authService.changePassword(principal, request);
        return ApiResponse.ok(null, "비밀번호를 변경했습니다.");
    }

    @DeleteMapping("/account")
    public ApiResponse<Void> deleteAccount(
            HttpServletRequest servletRequest,
            @Valid @RequestBody DeleteAccountRequest request) {
        MemberPrincipal principal = AuthenticatedRequest.principal(servletRequest);
        authService.deleteAccount(principal, request);
        return ApiResponse.ok(null, "계정을 삭제했습니다.");
    }
}
