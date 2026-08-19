package com.travelglobe.trableglobeapi.social.repository;

import com.travelglobe.trableglobeapi.social.domain.TravelLike;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TravelLikeRepository extends JpaRepository<TravelLike, Long> {

    long countByTravelId(Long travelId);

    boolean existsByTravelIdAndMemberId(Long travelId, Long memberId);

    Optional<TravelLike> findByTravelIdAndMemberId(Long travelId, Long memberId);

    void deleteAllByTravelId(Long travelId);

    void deleteAllByTravelMemberId(Long memberId);

    void deleteAllByMemberId(Long memberId);
}
