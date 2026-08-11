package com.travelglobe.trableglobeapi.travel.dto;

import com.travelglobe.trableglobeapi.location.domain.City;
import java.math.BigDecimal;

/**
 * City as referenced from a travel payload. Null whenever a stop has no city recorded.
 */
public record CityRef(
        Long id,
        String nameEn,
        String nameKo,
        BigDecimal latitude,
        BigDecimal longitude) {

    public static CityRef from(City city) {
        if (city == null) {
            return null;
        }
        return new CityRef(
                city.getId(),
                city.getNameEn(),
                city.getNameKo(),
                city.getLatitude(),
                city.getLongitude());
    }
}
