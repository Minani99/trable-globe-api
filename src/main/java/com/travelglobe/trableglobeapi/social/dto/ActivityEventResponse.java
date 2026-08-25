package com.travelglobe.trableglobeapi.social.dto;

import java.time.Instant;

public record ActivityEventResponse(
        String id,
        String type,
        SocialAuthorResponse actor,
        Long travelId,
        String travelTitle,
        String preview,
        Instant createdAt) {
}
