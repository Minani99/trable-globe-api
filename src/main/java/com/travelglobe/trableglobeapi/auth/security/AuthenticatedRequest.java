package com.travelglobe.trableglobeapi.auth.security;

import jakarta.servlet.http.HttpServletRequest;

public final class AuthenticatedRequest {

    static final String PRINCIPAL_ATTRIBUTE = AuthenticatedRequest.class.getName() + ".principal";

    private AuthenticatedRequest() {
    }

    public static MemberPrincipal principal(HttpServletRequest request) {
        Object principal = request.getAttribute(PRINCIPAL_ATTRIBUTE);
        if (principal instanceof MemberPrincipal memberPrincipal) {
            return memberPrincipal;
        }
        throw new IllegalStateException("Authenticated endpoint did not receive a member principal");
    }
}
