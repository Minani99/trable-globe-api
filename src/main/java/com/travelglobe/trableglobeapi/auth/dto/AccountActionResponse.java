package com.travelglobe.trableglobeapi.auth.dto;

import java.time.Instant;

public record AccountActionResponse(String message, String developmentToken, Instant expiresAt) {
}
