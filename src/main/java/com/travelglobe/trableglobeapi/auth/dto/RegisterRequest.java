package com.travelglobe.trableglobeapi.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank(message = "사용자명을 입력해 주세요.")
        @Pattern(regexp = "^[A-Za-z0-9][A-Za-z0-9._-]{2,29}$",
                message = "사용자명은 영문, 숫자, 점, 밑줄, 하이픈으로 3~30자여야 합니다.")
        String username,

        @NotBlank(message = "이름을 입력해 주세요.")
        @Size(min = 2, max = 60, message = "이름은 2~60자로 입력해 주세요.")
        String displayName,

        @NotBlank(message = "이메일을 입력해 주세요.")
        @Email(message = "이메일 형식을 확인해 주세요.")
        @Size(max = 254, message = "이메일이 너무 깁니다.")
        String email,

        @NotBlank(message = "비밀번호를 입력해 주세요.")
        @Size(min = 10, max = 72, message = "비밀번호는 10~72자로 입력해 주세요.")
        String password) {
}
