package com.travelglobe.trableglobeapi.travel.domain;

import com.travelglobe.trableglobeapi.global.domain.BaseTimeEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.ForeignKey;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDate;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "travel_reservations")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class TravelReservation extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "travel_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_travel_reservations_travel"))
    private Travel travel;

    @Column(name = "title", nullable = false, length = 120)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(name = "category", nullable = false, length = 20)
    private TravelReservationCategory category;

    @Column(name = "reservation_date", nullable = false)
    private LocalDate reservationDate;

    @Column(name = "memo", length = 500)
    private String memo;

    @Column(name = "confirmed", nullable = false)
    private boolean confirmed;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    private TravelReservation(Travel travel, String title, TravelReservationCategory category,
                              LocalDate reservationDate, String memo, int sortOrder) {
        this.travel = travel;
        this.title = title;
        this.category = category;
        this.reservationDate = reservationDate;
        this.memo = memo;
        this.sortOrder = sortOrder;
        this.confirmed = false;
    }

    public static TravelReservation create(Travel travel, String title, TravelReservationCategory category,
                                           LocalDate reservationDate, String memo, int sortOrder) {
        return new TravelReservation(travel, title, category, reservationDate, memo, sortOrder);
    }

    public void update(String title, TravelReservationCategory category, LocalDate reservationDate,
                       String memo, boolean confirmed) {
        this.title = title;
        this.category = category;
        this.reservationDate = reservationDate;
        this.memo = memo;
        this.confirmed = confirmed;
    }
}
