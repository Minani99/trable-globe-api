package com.travelglobe.trableglobeapi.social.repository;

import com.travelglobe.trableglobeapi.social.domain.MemberBlock;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MemberBlockRepository extends JpaRepository<MemberBlock, Long> {

    boolean existsByBlockerIdAndBlockedId(Long blockerId, Long blockedId);

    Optional<MemberBlock> findByBlockerIdAndBlockedId(Long blockerId, Long blockedId);

    @Query("""
            select (count(block) > 0) from MemberBlock block
            where (block.blocker.id = :firstId and block.blocked.id = :secondId)
               or (block.blocker.id = :secondId and block.blocked.id = :firstId)
            """)
    boolean existsBetween(@Param("firstId") Long firstId, @Param("secondId") Long secondId);

    @Modifying
    @Query("delete from MemberBlock block where block.blocker.id = :memberId or block.blocked.id = :memberId")
    void deleteAllForMember(@Param("memberId") Long memberId);
}
