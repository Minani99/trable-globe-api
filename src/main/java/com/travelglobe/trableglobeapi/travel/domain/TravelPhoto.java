package com.travelglobe.trableglobeapi.travel.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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

/**
 * A photo attached to a trip, optionally pinned to one stop.
 *
 * <p>Only the URL is stored. Uploading, resizing and CDN delivery are deliberately out of
 * scope for this phase; swapping placeholder URLs for object-storage URLs later needs no
 * schema change.
 */
@Entity
@Table(name = "travel_photos")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class TravelPhoto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "travel_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_travel_photos_travel"))
    private Travel travel;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "travel_place_id",
            foreignKey = @ForeignKey(name = "fk_travel_photos_place"))
    private TravelPlace travelPlace;

    @Column(name = "image_url", nullable = false, length = 500)
    private String imageUrl;

    @Column(name = "caption", length = 300)
    private String caption;

    @Column(name = "taken_at")
    private LocalDate takenAt;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    private TravelPhoto(Travel travel, TravelPlace travelPlace, String imageUrl,
                        String caption, LocalDate takenAt, int sortOrder) {
        this.travel = travel;
        this.travelPlace = travelPlace;
        this.imageUrl = imageUrl;
        this.caption = caption;
        this.takenAt = takenAt;
        this.sortOrder = sortOrder;
    }

    public static TravelPhoto create(Travel travel, TravelPlace travelPlace, String imageUrl,
                                     String caption, LocalDate takenAt, int sortOrder) {
        return new TravelPhoto(travel, travelPlace, imageUrl, caption, takenAt, sortOrder);
    }
}
