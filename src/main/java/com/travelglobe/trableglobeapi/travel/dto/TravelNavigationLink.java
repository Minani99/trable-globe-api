package com.travelglobe.trableglobeapi.travel.dto;

import com.travelglobe.trableglobeapi.travel.repository.projection.TravelNavProjection;
import java.time.LocalDate;

/**
 * Previous/next trip link on the detail page.
 */
public record TravelNavigationLink(Long id, String title, LocalDate startDate) {

    public static TravelNavigationLink from(TravelNavProjection projection) {
        if (projection == null) {
            return null;
        }
        return new TravelNavigationLink(projection.id(), projection.title(), projection.startDate());
    }
}
