package com.travelglobe.trableglobeapi.social.dto;

import com.travelglobe.trableglobeapi.member.domain.Member;

public record MemberDiscoveryResponse(
        String username,
        String displayName,
        String bio,
        String profileImageUrl,
        long countryCount,
        long travelCount,
        long followerCount,
        boolean following,
        long sharedCountryCount,
        String recommendationReason) {

    public static MemberDiscoveryResponse of(
            Member member,
            long countryCount,
            long travelCount,
            long followerCount,
            boolean following,
            long sharedCountryCount,
            String recommendationReason) {
        return new MemberDiscoveryResponse(
                member.getUsername(), member.getDisplayName(), member.getBio(), member.getProfileImageUrl(),
                countryCount, travelCount, followerCount, following, sharedCountryCount, recommendationReason);
    }
}
