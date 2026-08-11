package com.travelglobe.trableglobeapi.location.repository;

import com.travelglobe.trableglobeapi.location.domain.City;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CityRepository extends JpaRepository<City, Long> {

    Optional<City> findByCountryIso2CodeAndNameEn(String iso2Code, String nameEn);
}
