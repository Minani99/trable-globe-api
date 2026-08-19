package com.travelglobe.trableglobeapi.social.dto;

import java.util.List;

public record TravelSocialResponse(
        long likeCount,
        boolean likedByCurrentMember,
        long commentCount,
        List<TravelCommentResponse> comments) {
}
