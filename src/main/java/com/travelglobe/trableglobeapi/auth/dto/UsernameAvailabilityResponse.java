package com.travelglobe.trableglobeapi.auth.dto;

public record UsernameAvailabilityResponse(
        boolean available,
        String normalizedUsername,
        String message) {
}
