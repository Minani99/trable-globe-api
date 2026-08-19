package com.travelglobe.trableglobeapi.social.repository;

import com.travelglobe.trableglobeapi.social.domain.MemberFollow;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MemberFollowRepository extends JpaRepository<MemberFollow, Long> {

    boolean existsByFollowerIdAndFollowingId(Long followerId, Long followingId);

    Optional<MemberFollow> findByFollowerIdAndFollowingId(Long followerId, Long followingId);

    long countByFollowerId(Long followerId);

    long countByFollowingId(Long followingId);

    void deleteAllByFollowerIdOrFollowingId(Long followerId, Long followingId);
}
