package com.travelglobe.trableglobeapi.travel.dto;

import com.travelglobe.trableglobeapi.location.domain.Country;
import java.math.BigDecimal;

/**
 * Country as referenced from a travel payload.
 *
 * <p>Carries the centroid as well as the names so the frontend can plot a trip without a
 * second lookup against the visited-countries endpoint.
 */
public record CountryRef(
        String iso2Code,
        String iso3Code,
        String nameEn,
        String nameKo,
        BigDecimal latitude,
        BigDecimal longitude) {

    public static CountryRef from(Country country) {
        return new CountryRef(
                country.getIso2Code(),
                country.getIso3Code(),
                country.getNameEn(),
                country.getNameKo(),
                country.getLatitude(),
                country.getLongitude());
    }
}
