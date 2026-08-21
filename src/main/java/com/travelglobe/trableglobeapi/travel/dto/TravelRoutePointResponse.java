package com.travelglobe.trableglobeapi.travel.dto;

import com.travelglobe.trableglobeapi.travel.domain.TravelPlace;
import java.math.BigDecimal;

/** A public, map-ready stop in itinerary order. */
public record TravelRoutePointResponse(
        BigDecimal latitude,
        BigDecimal longitude,
        String label,
        String countryCode) {

    public static TravelRoutePointResponse from(TravelPlace place) {
        return new TravelRoutePointResponse(
                place.resolveLatitude(),
                place.resolveLongitude(),
                place.getPlaceName(),
                place.getCountry().getIso2Code());
    }
}
