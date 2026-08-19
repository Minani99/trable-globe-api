package com.travelglobe.trableglobeapi.social.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateCommentRequest(
        @NotBlank(message = "댓글을 입력해 주세요.")
        @Size(max = 500, message = "댓글은 500자 이내로 입력해 주세요.")
        String content) {
}
