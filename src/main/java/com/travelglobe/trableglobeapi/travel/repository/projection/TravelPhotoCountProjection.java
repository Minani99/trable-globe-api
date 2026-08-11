package com.travelglobe.trableglobeapi.travel.repository.projection;

/**
 * Photo totals per trip, fetched in one query so a travel list never triggers N+1.
 */
public record TravelPhotoCountProjection(Long travelId, Long photoCount) {
}
