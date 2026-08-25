package com.travelglobe.trableglobeapi.travel.repository;

import com.travelglobe.trableglobeapi.travel.domain.TravelTask;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TravelTaskRepository extends JpaRepository<TravelTask, Long> {

    @Query("""
            select task
            from TravelTask task
            where task.travel.id = :travelId and task.travel.member.id = :memberId
            order by task.sortOrder asc, task.id asc
            """)
    List<TravelTask> findOwnedTasks(@Param("travelId") Long travelId,
                                    @Param("memberId") Long memberId);

    Optional<TravelTask> findByIdAndTravelIdAndTravelMemberId(
            Long id, Long travelId, Long memberId);

    long countByTravelId(Long travelId);

    void deleteAllByTravelId(Long travelId);
}
