package com.travelglobe.trableglobeapi.auth.repository;

import com.travelglobe.trableglobeapi.auth.domain.AuthSession;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AuthSessionRepository extends JpaRepository<AuthSession, UUID> {

    @Query("""
            select s from AuthSession s
              join fetch s.member
            where s.tokenHash = :tokenHash
              and s.revokedAt is null
              and s.expiresAt > :now
            """)
    Optional<AuthSession> findActive(@Param("tokenHash") String tokenHash,
                                     @Param("now") Instant now);

    @Query("select s from AuthSession s where s.id = :id and s.member.id = :memberId")
    Optional<AuthSession> findOwned(@Param("id") UUID id, @Param("memberId") Long memberId);

    @Modifying
    @Query("update AuthSession s set s.revokedAt = :now where s.member.id = :memberId and s.revokedAt is null")
    void revokeAllForMember(@Param("memberId") Long memberId, @Param("now") Instant now);

    @Modifying
    @Query("delete from AuthSession s where s.member.id = :memberId")
    void deleteAllForMember(@Param("memberId") Long memberId);

    @Modifying
    @Query("""
            delete from AuthSession s
            where s.expiresAt <= :cutoff
               or (s.revokedAt is not null and s.revokedAt <= :cutoff)
            """)
    int deleteStale(@Param("cutoff") Instant cutoff);
}
