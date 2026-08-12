package com.travelglobe.trableglobeapi.auth.dto;

import java.time.Instant;

/** Raw token is returned once; the Next.js BFF moves it into an HttpOnly cookie. */
public record AuthSessionResponse(String token, Instant expiresAt, AuthMemberResponse member) {
}
