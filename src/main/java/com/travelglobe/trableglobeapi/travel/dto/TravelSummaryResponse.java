package com.travelglobe.trableglobeapi.travel.dto;

import com.travelglobe.trableglobeapi.travel.domain.Travel;
import com.travelglobe.trableglobeapi.travel.domain.TravelPlace;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * What a travel card needs, and nothing more.
 *
 * <p>{@code primaryCountry} / {@code primaryCity} come from the first stop on the
 * itinerary and drive the card's "TAIWAN - TAIPEI" line; {@code countries} carries the
 * full set so the frontend can filter cards by the country selected on the globe.
 */
public record TravelSummaryResponse(
        Long id,
        String title,
        String description,
        LocalDate startDate,
        LocalDate endDate,
        int durationDays,
        String coverImageUrl,
        CountryRef primaryCountry,
        CityRef primaryCity,
        List<CountryRef> countries,
        int placeCount,
        long photoCount) {

    public static TravelSummaryResponse from(Travel travel, long photoCount) {
        List<TravelPlace> places = orderedPlaces(travel);
        TravelPlace first = places.isEmpty() ? null : places.get(0);

        return new TravelSummaryResponse(
                travel.getId(),
                travel.getTitle(),
                travel.getDescription(),
                travel.getStartDate(),
                travel.getEndDate(),
                travel.getDurationDays(),
                travel.getCoverImageUrl(),
                first == null ? null : CountryRef.from(first.getCountry()),
                first == null ? null : CityRef.from(first.getCity()),
                distinctCountries(places),
                places.size(),
                photoCount);
    }

    /**
     * Sorts defensively rather than trusting the fetch join to preserve {@code @OrderBy}.
     */
    static List<TravelPlace> orderedPlaces(Travel travel) {
        return travel.getPlaces().stream()
                .sorted(Comparator.comparingInt(TravelPlace::getSortOrder)
                        .thenComparing(TravelPlace::getId, Comparator.nullsLast(Comparator.naturalOrder())))
                .toList();
    }

    /** Countries in itinerary order, de-duplicated by ISO code. */
    static List<CountryRef> distinctCountries(List<TravelPlace> orderedPlaces) {
        Map<String, CountryRef> byCode = new LinkedHashMap<>();
        for (TravelPlace place : orderedPlaces) {
            byCode.computeIfAbsent(place.getCountry().getIso2Code(), code -> CountryRef.from(place.getCountry()));
        }
        return List.copyOf(byCode.values());
    }
}
