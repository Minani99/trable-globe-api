package com.travelglobe.trableglobeapi.profile.dto;

import com.travelglobe.trableglobeapi.member.domain.Member;
import com.travelglobe.trableglobeapi.statistics.dto.TravelStatisticsResponse;
import java.time.Instant;

/**
 * Public profile header: identity plus the three headline numbers.
 */
public record ProfileResponse(
        String username,
        String displayName,
        String bio,
        String profileImageUrl,
        Instant joinedAt,
        TravelStatisticsResponse statistics,
        long followerCount,
        long followingCount) {

    public static ProfileResponse of(
            Member member,
            TravelStatisticsResponse statistics,
            long followerCount,
            long followingCount) {
        return new ProfileResponse(
                member.getUsername(),
                member.getDisplayName(),
                member.getBio(),
                member.getProfileImageUrl(),
                member.getCreatedAt(),
                statistics,
                followerCount,
                followingCount);
    }
}
