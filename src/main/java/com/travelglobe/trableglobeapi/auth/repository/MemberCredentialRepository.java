package com.travelglobe.trableglobeapi.auth.repository;

import com.travelglobe.trableglobeapi.auth.domain.MemberCredential;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MemberCredentialRepository extends JpaRepository<MemberCredential, Long> {

    boolean existsByEmail(String email);

    @Query("select c from MemberCredential c join fetch c.member where c.email = :email")
    Optional<MemberCredential> findByEmailWithMember(@Param("email") String email);

    @Query("select c from MemberCredential c join fetch c.member where c.member.id = :memberId")
    Optional<MemberCredential> findByMemberIdWithMember(@Param("memberId") Long memberId);
}
