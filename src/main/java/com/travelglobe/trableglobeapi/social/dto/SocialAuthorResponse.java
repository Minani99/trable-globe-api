package com.travelglobe.trableglobeapi.social.dto;

import com.travelglobe.trableglobeapi.member.domain.Member;

public record SocialAuthorResponse(
        String username,
        String displayName,
        String profileImageUrl) {

    public static SocialAuthorResponse from(Member member) {
        return new SocialAuthorResponse(
                member.getUsername(), member.getDisplayName(), member.getProfileImageUrl());
    }
}
