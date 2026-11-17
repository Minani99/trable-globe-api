package com.travelglobe.trableglobeapi.travel.dto;

import java.util.List;

/** Everything the trip editor needs to open, so it is one request instead of three. */
public record TravelWorkspaceResponse(
        TravelDetailResponse travel,
        List<TravelTaskResponse> tasks,
        TravelPlanningResponse planning) {
}
