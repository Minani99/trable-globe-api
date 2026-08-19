package com.travelglobe.trableglobeapi.social.dto;

public record MemberSafetyStatusResponse(
        boolean blockedByCurrentMember,
        boolean interactionRestricted) {
}
