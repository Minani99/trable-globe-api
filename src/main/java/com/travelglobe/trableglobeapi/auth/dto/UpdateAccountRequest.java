package com.travelglobe.trableglobeapi.auth.dto;

import com.travelglobe.trableglobeapi.member.domain.UsernamePolicy;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UpdateAccountRequest(
        @NotBlank(message = "사용자명을 입력해 주세요.")
        @Pattern(regexp = UsernamePolicy.PATTERN, message = UsernamePolicy.FORMAT_MESSAGE)
        String username,

        @NotBlank(message = "이메일을 입력해 주세요.")
        @Email(message = "이메일 형식을 확인해 주세요.")
        @Size(max = 254, message = "이메일이 너무 깁니다.")
        String email,

        @NotBlank(message = "현재 비밀번호를 입력해 주세요.")
        String currentPassword) {
}
