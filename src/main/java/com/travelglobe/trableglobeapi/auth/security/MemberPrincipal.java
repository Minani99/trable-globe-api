package com.travelglobe.trableglobeapi.auth.security;

import java.util.UUID;

/** Identity placed in Spring Security's context after an opaque token is verified. */
public record MemberPrincipal(Long memberId, String username, UUID sessionId) {
}
