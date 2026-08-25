package com.travelglobe.trableglobeapi.travel.dto;

import com.travelglobe.trableglobeapi.travel.domain.TravelTask;
import java.time.Instant;

public record TravelTaskResponse(
        Long id,
        String title,
        String category,
        boolean completed,
        int sortOrder,
        Instant updatedAt) {

    public static TravelTaskResponse from(TravelTask task) {
        return new TravelTaskResponse(
                task.getId(),
                task.getTitle(),
                task.getCategory().name(),
                task.isCompleted(),
                task.getSortOrder(),
                task.getUpdatedAt());
    }
}
