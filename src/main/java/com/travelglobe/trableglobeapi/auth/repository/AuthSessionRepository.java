package com.travelglobe.trableglobeapi.auth.repository;

import com.travelglobe.trableglobeapi.auth.domain.AuthSession;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
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
}
