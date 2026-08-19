package com.travelglobe.trableglobeapi.social.dto;

import com.travelglobe.trableglobeapi.social.domain.TravelComment;
import java.time.Instant;

public record TravelCommentResponse(
        Long id,
        SocialAuthorResponse author,
        String content,
        Instant createdAt,
        boolean canDelete) {

    public static TravelCommentResponse from(TravelComment comment, boolean canDelete) {
        return new TravelCommentResponse(
                comment.getId(),
                SocialAuthorResponse.from(comment.getMember()),
                comment.getContent(),
                comment.getCreatedAt(),
                canDelete);
    }
}
