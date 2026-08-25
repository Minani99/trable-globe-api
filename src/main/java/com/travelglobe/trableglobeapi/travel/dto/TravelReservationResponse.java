package com.travelglobe.trableglobeapi.travel.dto;

import com.travelglobe.trableglobeapi.travel.domain.TravelReservation;
import com.travelglobe.trableglobeapi.travel.domain.TravelReservationCategory;
import java.time.LocalDate;

public record TravelReservationResponse(
        Long id,
        String title,
        TravelReservationCategory category,
        LocalDate reservationDate,
        String memo,
        boolean confirmed) {

    public static TravelReservationResponse from(TravelReservation reservation) {
        return new TravelReservationResponse(
                reservation.getId(), reservation.getTitle(), reservation.getCategory(),
                reservation.getReservationDate(), reservation.getMemo(), reservation.isConfirmed());
    }
}
