package com.travelglobe.trableglobeapi.travel.domain;

import com.travelglobe.trableglobeapi.location.domain.City;
import com.travelglobe.trableglobeapi.location.domain.Country;
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
import java.math.BigDecimal;
import java.time.LocalDate;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * A stop within a trip: the row that makes a country "visited".
 *
 * <p>This is the single source of truth for every map and statistic. There is no separate
 * {@code Visit} entity because a visit without a trip has nothing to show on the globe -
 * splitting them would only add a join.
 *
 * <p>{@code country} is required; {@code city} is optional so that a stop can be recorded
 * before its city exists in reference data.
 */
@Entity
@Table(name = "travel_places")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class TravelPlace {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "travel_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_travel_places_travel"))
    private Travel travel;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "country_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_travel_places_country"))
    private Country country;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "city_id",
            foreignKey = @ForeignKey(name = "fk_travel_places_city"))
    private City city;

    @Column(name = "place_name", nullable = false, length = 150)
    private String placeName;

    @Column(name = "latitude", precision = 9, scale = 6)
    private BigDecimal latitude;

    @Column(name = "longitude", precision = 9, scale = 6)
    private BigDecimal longitude;

    @Column(name = "visited_at")
    private LocalDate visitedAt;

    @Column(name = "memo", length = 1000)
    private String memo;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    private TravelPlace(Country country, City city, String placeName, BigDecimal latitude,
                        BigDecimal longitude, LocalDate visitedAt, String memo, int sortOrder) {
        this.country = country;
        this.city = city;
        this.placeName = placeName;
        this.latitude = latitude;
        this.longitude = longitude;
        this.visitedAt = visitedAt;
        this.memo = memo;
        this.sortOrder = sortOrder;
    }

    public static TravelPlace create(Country country, City city, String placeName, BigDecimal latitude,
                                     BigDecimal longitude, LocalDate visitedAt, String memo, int sortOrder) {
        if (city != null && !city.belongsTo(country)) {
            throw new IllegalArgumentException("방문 도시와 국가는 서로 일치해야 합니다.");
        }
        return new TravelPlace(country, city, placeName, latitude, longitude, visitedAt, memo, sortOrder);
    }

    /** Called by {@link Travel#addPlace} - the owning side stays package internal. */
    void assignTo(Travel travel) {
        this.travel = travel;
    }

    /** True when this stop is owned by the supplied trip. */
    public boolean belongsTo(Travel candidate) {
        if (travel == candidate) {
            return true;
        }
        return travel != null && candidate != null
                && travel.getId() != null && travel.getId().equals(candidate.getId());
    }

    /**
     * Best available latitude for plotting this stop.
     *
     * <p>Falls back from the exact place to its city and finally to the country centroid,
     * so a marker always has somewhere to sit even on a sparsely filled record.
     */
    public BigDecimal resolveLatitude() {
        if (latitude != null) {
            return latitude;
        }
        return city != null ? city.getLatitude() : country.getLatitude();
    }

    /** @see #resolveLatitude() */
    public BigDecimal resolveLongitude() {
        if (longitude != null) {
            return longitude;
        }
        return city != null ? city.getLongitude() : country.getLongitude();
    }
}
