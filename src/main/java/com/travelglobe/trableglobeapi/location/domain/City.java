package com.travelglobe.trableglobeapi.location.domain;

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
import jakarta.persistence.UniqueConstraint;
import java.math.BigDecimal;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * Reference data for a city, always owned by a {@link Country}.
 *
 * <p>Unique per country by English name so that repeated visits reuse one row and the
 * "cities visited" statistic stays honest.
 */
@Entity
@Table(
        name = "cities",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_cities_country_name_en", columnNames = {"country_id", "name_en"}))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class City {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "country_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_cities_country"))
    private Country country;

    @Column(name = "name_en", nullable = false, length = 100)
    private String nameEn;

    @Column(name = "name_ko", nullable = false, length = 100)
    private String nameKo;

    @Column(name = "latitude", nullable = false, precision = 9, scale = 6)
    private BigDecimal latitude;

    @Column(name = "longitude", nullable = false, precision = 9, scale = 6)
    private BigDecimal longitude;

    private City(Country country, String nameEn, String nameKo, BigDecimal latitude, BigDecimal longitude) {
        this.country = country;
        this.nameEn = nameEn;
        this.nameKo = nameKo;
        this.latitude = latitude;
        this.longitude = longitude;
    }

    public static City create(Country country, String nameEn, String nameKo,
                              BigDecimal latitude, BigDecimal longitude) {
        return new City(country, nameEn, nameKo, latitude, longitude);
    }
}
