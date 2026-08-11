package com.travelglobe.trableglobeapi.statistics.dto;

import com.travelglobe.trableglobeapi.travel.repository.projection.TravelStatisticsProjection;
import java.time.LocalDate;

/**
 * The numbers shown next to the globe.
 *
 * <p>Counts are never null: a profile with no trips reports zeros, so the frontend can
 * render "00 Countries" without a null check.
 */
public record TravelStatisticsResponse(
        long countryCount,
        long cityCount,
        long travelCount,
        long placeCount,
        LocalDate firstTravelDate,
        LocalDate latestTravelDate) {

    public static final TravelStatisticsResponse EMPTY =
            new TravelStatisticsResponse(0, 0, 0, 0, null, null);

    public static TravelStatisticsResponse from(TravelStatisticsProjection projection) {
        if (projection == null) {
            return EMPTY;
        }
        return new TravelStatisticsResponse(
                orZero(projection.countryCount()),
                orZero(projection.cityCount()),
                orZero(projection.travelCount()),
                orZero(projection.placeCount()),
                projection.firstTravelDate(),
                projection.latestTravelDate());
    }

    private static long orZero(Long value) {
        return value == null ? 0L : value;
    }
}
