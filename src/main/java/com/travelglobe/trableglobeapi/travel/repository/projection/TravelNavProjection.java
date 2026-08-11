package com.travelglobe.trableglobeapi.travel.repository.projection;

import java.time.LocalDate;

/**
 * Lightweight row used to resolve the previous/next links on a travel detail page.
 */
public record TravelNavProjection(Long id, String title, LocalDate startDate) {
}
