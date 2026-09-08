package com.travelglobe.trableglobeapi.profile.dto;

import java.util.List;

public record ProfileRecapPreferenceResponse(
        int year,
        String narrative,
        List<Long> featuredTravelIds) {
}
