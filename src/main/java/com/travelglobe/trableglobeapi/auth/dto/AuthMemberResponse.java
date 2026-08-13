package com.travelglobe.trableglobeapi.auth.dto;

import com.travelglobe.trableglobeapi.auth.domain.MemberCredential;
import com.travelglobe.trableglobeapi.member.domain.Member;

/** Private account DTO. Password hashes and session data never enter this object. */
public record AuthMemberResponse(
        Long id,
        String username,
        String displayName,
        String bio,
        String profileImageUrl,
        String email,
        boolean emailVerified) {

    public static AuthMemberResponse from(MemberCredential credential) {
        Member member = credential.getMember();
        return new AuthMemberResponse(
                member.getId(), member.getUsername(), member.getDisplayName(), member.getBio(),
                member.getProfileImageUrl(), credential.getEmail(), credential.isEmailVerified());
    }
}
