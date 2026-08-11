package com.travelglobe.trableglobeapi.travel.repository.projection;

import java.time.LocalDate;

/**
 * Whole-profile totals computed in one aggregate query.
 *
 * <p>Every field is nullable: a member with no public trips still produces exactly one
 * row, with nulls for the counts and dates.
 */
public record TravelStatisticsProjection(
        Long countryCount,
        Long cityCount,
        Long travelCount,
        Long placeCount,
        LocalDate firstTravelDate,
        LocalDate latestTravelDate) {
}
