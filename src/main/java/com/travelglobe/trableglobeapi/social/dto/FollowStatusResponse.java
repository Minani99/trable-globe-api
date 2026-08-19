package com.travelglobe.trableglobeapi.social.dto;

public record FollowStatusResponse(
        boolean following,
        long followerCount,
        long followingCount) {
}
