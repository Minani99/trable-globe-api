package com.travelglobe.trableglobeapi.travel.dto;

import com.travelglobe.trableglobeapi.travel.domain.TravelPhoto;
import java.time.LocalDate;

public record TravelPhotoResponse(
        Long id,
        String imageUrl,
        String caption,
        LocalDate takenAt,
        int sortOrder,
        Long travelPlaceId) {

    public static TravelPhotoResponse from(TravelPhoto photo) {
        return new TravelPhotoResponse(
                photo.getId(),
                photo.getImageUrl(),
                photo.getCaption(),
                photo.getTakenAt(),
                photo.getSortOrder(),
                photo.getTravelPlace() == null ? null : photo.getTravelPlace().getId());
    }
}
