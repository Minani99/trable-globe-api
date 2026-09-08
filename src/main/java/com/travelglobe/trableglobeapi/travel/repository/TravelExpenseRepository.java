package com.travelglobe.trableglobeapi.travel.repository;

import com.travelglobe.trableglobeapi.travel.domain.TravelExpense;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TravelExpenseRepository extends JpaRepository<TravelExpense, Long> {

    @Query("""
            select expense
            from TravelExpense expense
            where expense.travel.id = :travelId and expense.travel.member.id = :memberId
            order by expense.sortOrder asc, expense.id asc
            """)
    List<TravelExpense> findOwnedExpenses(@Param("travelId") Long travelId,
                                          @Param("memberId") Long memberId);

    Optional<TravelExpense> findByIdAndTravelIdAndTravelMemberId(Long id, Long travelId, Long memberId);

    long countByTravelId(Long travelId);

    void deleteAllByTravelId(Long travelId);

    void deleteAllByTravelMemberId(Long memberId);
}
