package com.travelglobe.trableglobeapi.social.repository;

import com.travelglobe.trableglobeapi.social.domain.TravelLike;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TravelLikeRepository extends JpaRepository<TravelLike, Long> {

    long countByTravelId(Long travelId);

    boolean existsByTravelIdAndMemberId(Long travelId, Long memberId);

    Optional<TravelLike> findByTravelIdAndMemberId(Long travelId, Long memberId);

    @Query("""
            select interaction
            from TravelLike interaction
              join fetch interaction.member
              join fetch interaction.travel travel
            where travel.member.id = :memberId and interaction.member.id <> :memberId
            order by interaction.createdAt desc, interaction.id desc
            """)
    List<TravelLike> findRecentForTravelOwner(@Param("memberId") Long memberId, Pageable pageable);

    void deleteAllByTravelId(Long travelId);

    void deleteAllByTravelMemberId(Long memberId);

    void deleteAllByMemberId(Long memberId);
}
