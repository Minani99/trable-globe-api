package com.travelglobe.trableglobeapi.location.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.math.BigDecimal;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * Reference data for a country, shared by every member's travels.
 *
 * <p>Travels never store a country name as free text: the globe needs a stable ISO code
 * to match a rendered polygon and a fixed centroid to place a marker, and statistics need
 * countries to be countable.
 *
 * <p>{@code latitude}/{@code longitude} are the label centroid used for markers - not
 * necessarily the geometric centre (e.g. the United States centroid excludes Alaska so
 * the marker sits over the mainland).
 */
@Entity
@Table(
        name = "countries",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_countries_iso2", columnNames = "iso2_code"),
                @UniqueConstraint(name = "uk_countries_iso3", columnNames = "iso3_code")
        })
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Country {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** ISO 3166-1 alpha-2, upper case. Matches the feature ids in the frontend world atlas. */
    @Column(name = "iso2_code", nullable = false, length = 2)
    private String iso2Code;

    /** ISO 3166-1 alpha-3, upper case. */
    @Column(name = "iso3_code", nullable = false, length = 3)
    private String iso3Code;

    @Column(name = "name_en", nullable = false, length = 100)
    private String nameEn;

    @Column(name = "name_ko", nullable = false, length = 100)
    private String nameKo;

    @Column(name = "latitude", nullable = false, precision = 9, scale = 6)
    private BigDecimal latitude;

    @Column(name = "longitude", nullable = false, precision = 9, scale = 6)
    private BigDecimal longitude;

    private Country(String iso2Code, String iso3Code, String nameEn, String nameKo,
                    BigDecimal latitude, BigDecimal longitude) {
        this.iso2Code = iso2Code;
        this.iso3Code = iso3Code;
        this.nameEn = nameEn;
        this.nameKo = nameKo;
        this.latitude = latitude;
        this.longitude = longitude;
    }

    public static Country create(String iso2Code, String iso3Code, String nameEn, String nameKo,
                                 BigDecimal latitude, BigDecimal longitude) {
        return new Country(iso2Code.toUpperCase(), iso3Code.toUpperCase(), nameEn, nameKo, latitude, longitude);
    }
}
