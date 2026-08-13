package com.travelglobe.trableglobeapi.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record TokenRequest(
        @NotBlank(message = "인증 링크를 확인해 주세요.")
        @Size(max = 256, message = "인증 링크가 올바르지 않습니다.")
        String token) {
}
