package com.travelglobe.trableglobeapi.social.repository;

import com.travelglobe.trableglobeapi.social.domain.TravelComment;
import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TravelCommentRepository extends JpaRepository<TravelComment, Long> {

    @Query("""
            select c
            from TravelComment c
              join fetch c.member
            where c.travel.id = :travelId
            order by c.createdAt desc, c.id desc
            """)
    List<TravelComment> findLatest(@Param("travelId") Long travelId, Pageable pageable);

    @Query("""
            select interaction
            from TravelComment interaction
              join fetch interaction.member
              join fetch interaction.travel travel
            where travel.member.id = :memberId and interaction.member.id <> :memberId
            order by interaction.createdAt desc, interaction.id desc
            """)
    List<TravelComment> findRecentForTravelOwner(@Param("memberId") Long memberId, Pageable pageable);

    long countByTravelId(Long travelId);

    void deleteAllByTravelId(Long travelId);

    void deleteAllByTravelMemberId(Long memberId);

    void deleteAllByMemberId(Long memberId);
}
