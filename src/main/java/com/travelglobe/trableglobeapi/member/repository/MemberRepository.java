package com.travelglobe.trableglobeapi.member.repository;

import com.travelglobe.trableglobeapi.member.domain.Member;
import com.travelglobe.trableglobeapi.travel.domain.Visibility;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MemberRepository extends JpaRepository<Member, Long> {

    /** Handles are stored normalised, so callers must pass {@code Member.normalizeUsername(..)}. */
    Optional<Member> findByUsername(String username);

    boolean existsByUsername(String username);

    @Query("""
            select m from Member m
            where m.id <> :currentMemberId
              and (lower(m.username) like lower(concat('%', :query, '%'))
                or lower(m.displayName) like lower(concat('%', :query, '%')))
            order by case
                when lower(m.username) = lower(:query) then 0
                when lower(m.username) like lower(concat(:query, '%')) then 1
                when lower(m.displayName) like lower(concat(:query, '%')) then 2
                else 3 end,
                m.displayName asc, m.username asc
            """)
    List<Member> searchDiscoverableMembers(@Param("currentMemberId") Long currentMemberId,
                                           @Param("query") String query,
                                           Pageable pageable);

    @Query("""
            select distinct m
            from Travel t
              join t.member m
              join t.places p
            where m.id <> :currentMemberId
              and t.visibility = :visibility
            order by m.updatedAt desc, m.id desc
            """)
    List<Member> findDiscoveryCandidates(@Param("currentMemberId") Long currentMemberId,
                                         @Param("visibility") Visibility visibility,
                                         Pageable pageable);
}
