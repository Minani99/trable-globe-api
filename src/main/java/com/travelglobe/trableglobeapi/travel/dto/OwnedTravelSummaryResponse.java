package com.travelglobe.trableglobeapi.travel.dto;

import com.travelglobe.trableglobeapi.travel.domain.Travel;
import java.time.Instant;

public record OwnedTravelSummaryResponse(
        TravelSummaryResponse travel,
        String visibility,
        Instant updatedAt) {

    public static OwnedTravelSummaryResponse from(Travel travel, long photoCount) {
        return new OwnedTravelSummaryResponse(
                TravelSummaryResponse.from(travel, photoCount),
                travel.getVisibility().name(),
                travel.getUpdatedAt());
    }
}
