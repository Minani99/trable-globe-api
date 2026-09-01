package com.travelglobe.trableglobeapi.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UpdateProfileRequest(
        @NotBlank(message = "보여질 이름을 입력해 주세요.")
        @Size(min = 1, max = 60, message = "보여질 이름은 1~60자로 입력해 주세요.")
        @Pattern(regexp = "^[^<>\\p{Cntrl}]+$",
                message = "보여질 이름에는 꺾쇠괄호나 제어 문자를 사용할 수 없습니다.")
        String displayName,

        @Size(max = 300, message = "소개는 300자 이내로 입력해 주세요.")
        String bio,

        @Size(max = 500, message = "프로필 이미지 주소가 너무 깁니다.")
        String profileImageUrl) {
}
