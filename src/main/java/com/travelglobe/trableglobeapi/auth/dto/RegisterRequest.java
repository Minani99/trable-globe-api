package com.travelglobe.trableglobeapi.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import com.travelglobe.trableglobeapi.member.domain.UsernamePolicy;

public record RegisterRequest(
        @NotBlank(message = "사용자명을 입력해 주세요.")
        @Pattern(regexp = UsernamePolicy.PATTERN, message = UsernamePolicy.FORMAT_MESSAGE)
        String username,

        @NotBlank(message = "보여질 이름을 입력해 주세요.")
        @Size(min = 1, max = 60, message = "보여질 이름은 1~60자로 입력해 주세요.")
        @Pattern(regexp = "^[^<>\\p{Cntrl}]+$",
                message = "보여질 이름에는 꺾쇠괄호나 제어 문자를 사용할 수 없습니다.")
        String displayName,

        @NotBlank(message = "이메일을 입력해 주세요.")
        @Email(message = "이메일 형식을 확인해 주세요.")
        @Size(max = 254, message = "이메일이 너무 깁니다.")
        String email,

        @NotBlank(message = "비밀번호를 입력해 주세요.")
        @Size(min = 10, max = 72, message = "비밀번호는 10~72자로 입력해 주세요.")
        String password) {
}
