package com.travelglobe.trableglobeapi.location.repository;

import com.travelglobe.trableglobeapi.location.domain.Country;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CountryRepository extends JpaRepository<Country, Long> {

    Optional<Country> findByIso2Code(String iso2Code);

    boolean existsByIso2Code(String iso2Code);
}
