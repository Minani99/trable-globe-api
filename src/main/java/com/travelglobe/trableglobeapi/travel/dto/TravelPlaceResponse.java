package com.travelglobe.trableglobeapi.travel.dto;

import com.travelglobe.trableglobeapi.travel.domain.TravelPlace;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;

/**
 * A stop on the itinerary.
 *
 * <p>{@code latitude}/{@code longitude} are already resolved through the
 * place - city - country fallback, so the map never has to decide.
 */
public record TravelPlaceResponse(
        Long id,
        String placeName,
        CountryRef country,
        CityRef city,
        BigDecimal latitude,
        BigDecimal longitude,
        LocalDate visitedAt,
        LocalTime startTime,
        Integer durationMinutes,
        String memo,
        int sortOrder) {

    public static TravelPlaceResponse from(TravelPlace place) {
        return new TravelPlaceResponse(
                place.getId(),
                place.getPlaceName(),
                CountryRef.from(place.getCountry()),
                CityRef.from(place.getCity()),
                place.resolveLatitude(),
                place.resolveLongitude(),
                place.getVisitedAt(),
                place.getStartTime(),
                place.getDurationMinutes(),
                place.getMemo(),
                place.getSortOrder());
    }
}
