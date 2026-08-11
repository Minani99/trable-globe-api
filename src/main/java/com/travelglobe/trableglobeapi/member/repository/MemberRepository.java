package com.travelglobe.trableglobeapi.member.repository;

import com.travelglobe.trableglobeapi.member.domain.Member;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MemberRepository extends JpaRepository<Member, Long> {

    /** Handles are stored normalised, so callers must pass {@code Member.normalizeUsername(..)}. */
    Optional<Member> findByUsername(String username);

    boolean existsByUsername(String username);
}
