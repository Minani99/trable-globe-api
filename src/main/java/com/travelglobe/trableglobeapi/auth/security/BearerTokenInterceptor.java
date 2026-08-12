package com.travelglobe.trableglobeapi.auth.security;

import tools.jackson.databind.ObjectMapper;
import com.travelglobe.trableglobeapi.auth.service.AuthSessionService;
import com.travelglobe.trableglobeapi.global.exception.ErrorCode;
import com.travelglobe.trableglobeapi.global.response.ApiError;
import com.travelglobe.trableglobeapi.global.response.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.nio.charset.StandardCharsets;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

/** Protects write APIs with an explicit bearer token; public reads remain anonymous. */
@Component
public class BearerTokenInterceptor implements HandlerInterceptor {

    private static final String PREFIX = "Bearer ";

    private final AuthSessionService authSessionService;
    private final ObjectMapper objectMapper;

    public BearerTokenInterceptor(AuthSessionService authSessionService, ObjectMapper objectMapper) {
        this.authSessionService = authSessionService;
        this.objectMapper = objectMapper;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler)
            throws Exception {
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true;
        }
        String authorization = request.getHeader(HttpHeaders.AUTHORIZATION);
        MemberPrincipal principal = null;
        if (authorization != null && authorization.regionMatches(true, 0, PREFIX, 0, PREFIX.length())) {
            principal = authSessionService.authenticate(authorization.substring(PREFIX.length()).trim())
                    .orElse(null);
        }
        if (principal == null) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setCharacterEncoding(StandardCharsets.UTF_8.name());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            objectMapper.writeValue(response.getWriter(), ApiResponse.failure(
                    "로그인이 필요합니다.", ApiError.of(ErrorCode.AUTHENTICATION_REQUIRED.name())));
            return false;
        }
        request.setAttribute(AuthenticatedRequest.PRINCIPAL_ATTRIBUTE, principal);
        return true;
    }
}
