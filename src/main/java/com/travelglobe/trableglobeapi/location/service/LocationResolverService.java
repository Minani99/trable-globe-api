package com.travelglobe.trableglobeapi.location.service;

import com.travelglobe.trableglobeapi.location.domain.City;
import com.travelglobe.trableglobeapi.location.domain.Country;
import com.travelglobe.trableglobeapi.location.repository.CityRepository;
import com.travelglobe.trableglobeapi.location.repository.CountryRepository;
import com.travelglobe.trableglobeapi.travel.dto.write.CityWriteRequest;
import com.travelglobe.trableglobeapi.travel.dto.write.CountryWriteRequest;
import java.util.Locale;
import org.springframework.stereotype.Service;

/** Resolves shared ISO/city reference rows while a user writes an itinerary. */
@Service
public class LocationResolverService {

    private final CountryRepository countryRepository;
    private final CityRepository cityRepository;

    public LocationResolverService(CountryRepository countryRepository, CityRepository cityRepository) {
        this.countryRepository = countryRepository;
        this.cityRepository = cityRepository;
    }

    public Country resolveCountry(CountryWriteRequest request) {
        String iso2 = request.iso2Code().trim().toUpperCase(Locale.ROOT);
        return countryRepository.findByIso2Code(iso2)
                .orElseGet(() -> countryRepository.save(Country.create(
                        iso2,
                        request.iso3Code().trim().toUpperCase(Locale.ROOT),
                        request.nameEn().trim(),
                        request.nameKo().trim(),
                        request.latitude(),
                        request.longitude())));
    }

    public City resolveCity(Country country, CityWriteRequest request) {
        if (request == null) {
            return null;
        }
        String nameEn = request.nameEn().trim();
        return cityRepository.findByCountryIso2CodeAndNameEnIgnoreCase(country.getIso2Code(), nameEn)
                .orElseGet(() -> cityRepository.save(City.create(
                        country, nameEn, request.nameKo().trim(), request.latitude(), request.longitude())));
    }
}
