package com.travelglobe.trableglobeapi.social.dto;

import com.travelglobe.trableglobeapi.travel.repository.projection.CountryVisitProjection;
import java.math.BigDecimal;

/** A lightweight country marker for the static world preview in Explore. */
public record DiscoveryCountryResponse(
        String iso2Code,
        String nameKo,
        BigDecimal latitude,
        BigDecimal longitude) {

    public static DiscoveryCountryResponse from(CountryVisitProjection country) {
        return new DiscoveryCountryResponse(
                country.iso2Code(), country.nameKo(), country.latitude(), country.longitude());
    }
}
