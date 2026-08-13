package com.travelglobe.trableglobeapi.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record DeleteAccountRequest(
        @NotBlank(message = "현재 비밀번호를 입력해 주세요.")
        String password) {
}
