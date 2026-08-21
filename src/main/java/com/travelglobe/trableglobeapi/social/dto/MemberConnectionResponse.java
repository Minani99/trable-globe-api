package com.travelglobe.trableglobeapi.social.dto;

import com.travelglobe.trableglobeapi.member.domain.Member;

public record MemberConnectionResponse(
        String username,
        String displayName,
        String bio,
        String profileImageUrl,
        long followerCount,
        boolean following,
        boolean currentMember) {

    public static MemberConnectionResponse of(
            Member member, long followerCount, boolean following, boolean currentMember) {
        return new MemberConnectionResponse(
                member.getUsername(),
                member.getDisplayName(),
                member.getBio(),
                member.getProfileImageUrl(),
                followerCount,
                following,
                currentMember);
    }
}
