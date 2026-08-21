package com.travelglobe.trableglobeapi.social.repository;

import com.travelglobe.trableglobeapi.member.domain.Member;
import com.travelglobe.trableglobeapi.social.domain.MemberFollow;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MemberFollowRepository extends JpaRepository<MemberFollow, Long> {

    boolean existsByFollowerIdAndFollowingId(Long followerId, Long followingId);

    Optional<MemberFollow> findByFollowerIdAndFollowingId(Long followerId, Long followingId);

    void deleteByFollowerIdAndFollowingId(Long followerId, Long followingId);

    long countByFollowerId(Long followerId);

    long countByFollowingId(Long followingId);

    @Query("""
            select relation.follower
            from MemberFollow relation
            where relation.following.id = :memberId
            order by relation.createdAt desc
            """)
    List<Member> findFollowers(@Param("memberId") Long memberId, Pageable pageable);

    @Query("""
            select relation.following
            from MemberFollow relation
            where relation.follower.id = :memberId
            order by relation.createdAt desc
            """)
    List<Member> findFollowing(@Param("memberId") Long memberId, Pageable pageable);

    void deleteAllByFollowerIdOrFollowingId(Long followerId, Long followingId);
}
