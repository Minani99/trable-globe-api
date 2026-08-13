package com.travelglobe.trableglobeapi.auth.repository;

import com.travelglobe.trableglobeapi.auth.domain.AccountActionPurpose;
import com.travelglobe.trableglobeapi.auth.domain.AccountActionToken;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AccountActionTokenRepository extends JpaRepository<AccountActionToken, UUID> {

    @Query("""
            select t from AccountActionToken t
              join fetch t.credential c
              join fetch c.member
            where t.tokenHash = :tokenHash
              and t.purpose = :purpose
              and t.consumedAt is null
              and t.expiresAt > :now
            """)
    Optional<AccountActionToken> findActive(@Param("tokenHash") String tokenHash,
                                            @Param("purpose") AccountActionPurpose purpose,
                                            @Param("now") Instant now);

    @Modifying
    @Query("""
            update AccountActionToken t set t.consumedAt = :now
            where t.credential.id = :credentialId
              and t.purpose = :purpose
              and t.consumedAt is null
            """)
    void consumePrevious(@Param("credentialId") Long credentialId,
                         @Param("purpose") AccountActionPurpose purpose,
                         @Param("now") Instant now);

    @Modifying
    @Query("delete from AccountActionToken t where t.credential.id = :credentialId")
    void deleteAllForCredential(@Param("credentialId") Long credentialId);
}
