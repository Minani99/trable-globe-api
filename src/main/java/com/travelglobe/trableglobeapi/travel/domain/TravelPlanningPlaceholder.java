package com.travelglobe.trableglobeapi.travel.domain;

/**
 * Marker for a planning slot whose real place has not been chosen yet.
 *
 * <p>The planner creates places such as {@code "1일차 · 장소를 골라주세요"}. The frontend
 * ({@code lib/travel-placeholders.ts}) and the backend must agree on the marker, so the
 * rule lives here instead of being spread across services as a string literal.
 */
public final class TravelPlanningPlaceholder {

    public static final String MARKER = "골라주세요";

    private TravelPlanningPlaceholder() {
    }

    public static boolean isPlaceholder(String placeName) {
        return placeName == null || placeName.isBlank() || placeName.contains(MARKER);
    }
}

