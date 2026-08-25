package com.travelglobe.trableglobeapi.travel.repository;

import com.travelglobe.trableglobeapi.travel.domain.TravelReservation;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TravelReservationRepository extends JpaRepository<TravelReservation, Long> {

    @Query("""
            select reservation
            from TravelReservation reservation
            where reservation.travel.id = :travelId and reservation.travel.member.id = :memberId
            order by reservation.reservationDate asc, reservation.sortOrder asc, reservation.id asc
            """)
    List<TravelReservation> findOwnedReservations(@Param("travelId") Long travelId,
                                                  @Param("memberId") Long memberId);

    Optional<TravelReservation> findByIdAndTravelIdAndTravelMemberId(Long id, Long travelId, Long memberId);

    long countByTravelId(Long travelId);

    void deleteAllByTravelId(Long travelId);
}
