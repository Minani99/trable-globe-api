package com.travelglobe.trableglobeapi.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ResetPasswordRequest(
        @NotBlank(message = "재설정 링크를 확인해 주세요.")
        @Size(max = 256, message = "재설정 링크가 올바르지 않습니다.")
        String token,

        @NotBlank(message = "새 비밀번호를 입력해 주세요.")
        @Size(min = 10, max = 72, message = "비밀번호는 10~72자로 입력해 주세요.")
        String password) {
}
