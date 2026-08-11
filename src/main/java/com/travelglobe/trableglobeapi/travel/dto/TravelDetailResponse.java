package com.travelglobe.trableglobeapi.travel.dto;

import com.travelglobe.trableglobeapi.travel.domain.Travel;
import com.travelglobe.trableglobeapi.travel.domain.TravelPhoto;
import com.travelglobe.trableglobeapi.travel.domain.TravelPlace;
import java.time.LocalDate;
import java.util.List;

/**
 * Everything the travel detail page renders in one payload.
 */
public record TravelDetailResponse(
        Long id,
        String title,
        String description,
        LocalDate startDate,
        LocalDate endDate,
        int durationDays,
        String coverImageUrl,
        String visibility,
        TravelOwner owner,
        List<CountryRef> countries,
        List<TravelPlaceResponse> places,
        List<TravelPhotoResponse> photos,
        TravelNavigationLink previousTravel,
        TravelNavigationLink nextTravel) {

    /** Minimal author identity - enough to link back to the profile. */
    public record TravelOwner(String username, String displayName, String profileImageUrl) {
    }

    public static TravelDetailResponse of(Travel travel,
                                          List<TravelPhoto> photos,
                                          TravelNavigationLink previousTravel,
                                          TravelNavigationLink nextTravel) {
        List<TravelPlace> places = TravelSummaryResponse.orderedPlaces(travel);

        return new TravelDetailResponse(
                travel.getId(),
                travel.getTitle(),
                travel.getDescription(),
                travel.getStartDate(),
                travel.getEndDate(),
                travel.getDurationDays(),
                travel.getCoverImageUrl(),
                travel.getVisibility().name(),
                new TravelOwner(
                        travel.getMember().getUsername(),
                        travel.getMember().getDisplayName(),
                        travel.getMember().getProfileImageUrl()),
                TravelSummaryResponse.distinctCountries(places),
                places.stream().map(TravelPlaceResponse::from).toList(),
                photos.stream().map(TravelPhotoResponse::from).toList(),
                previousTravel,
                nextTravel);
    }
}
