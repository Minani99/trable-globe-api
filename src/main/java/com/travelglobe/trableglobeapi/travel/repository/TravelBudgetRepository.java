package com.travelglobe.trableglobeapi.travel.repository;

import com.travelglobe.trableglobeapi.travel.domain.TravelBudget;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TravelBudgetRepository extends JpaRepository<TravelBudget, Long> {

    Optional<TravelBudget> findByTravelIdAndTravelMemberId(Long travelId, Long memberId);

    void deleteAllByTravelId(Long travelId);

    void deleteAllByTravelMemberId(Long memberId);
}
