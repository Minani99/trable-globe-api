package com.travelglobe.trableglobeapi.travel.repository.projection;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * One row per visited country, aggregated in the database.
 *
 * <p>Counting in SQL keeps the globe payload a single query regardless of how many trips
 * a member has recorded.
 */
public record CountryVisitProjection(
        String iso2Code,
        String iso3Code,
        String nameEn,
        String nameKo,
        BigDecimal latitude,
        BigDecimal longitude,
        Long travelCount,
        Long cityCount,
        LocalDate lastVisitedAt) {
}
