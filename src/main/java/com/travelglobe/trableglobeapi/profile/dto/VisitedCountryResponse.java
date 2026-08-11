package com.travelglobe.trableglobeapi.profile.dto;

import com.travelglobe.trableglobeapi.travel.repository.projection.CountryVisitProjection;
import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * One visited country as the globe needs it: a code to highlight, a coordinate to place a
 * marker, and counts to size and label it.
 */
public record VisitedCountryResponse(
        String iso2Code,
        String iso3Code,
        String nameEn,
        String nameKo,
        BigDecimal latitude,
        BigDecimal longitude,
        long travelCount,
        long cityCount,
        LocalDate lastVisitedAt) {

    public static VisitedCountryResponse from(CountryVisitProjection projection) {
        return new VisitedCountryResponse(
                projection.iso2Code(),
                projection.iso3Code(),
                projection.nameEn(),
                projection.nameKo(),
                projection.latitude(),
                projection.longitude(),
                projection.travelCount() == null ? 0L : projection.travelCount(),
                projection.cityCount() == null ? 0L : projection.cityCount(),
                projection.lastVisitedAt());
    }
}
