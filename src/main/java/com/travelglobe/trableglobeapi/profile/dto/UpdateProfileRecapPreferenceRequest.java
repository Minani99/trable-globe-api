package com.travelglobe.trableglobeapi.profile.dto;

import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.util.List;

public record UpdateProfileRecapPreferenceRequest(
        @Size(max = 240, message = "리캡 문장은 240자 이하로 입력해 주세요.")
        String narrative,
        @Size(max = 3, message = "대표 여행은 3개까지 선택할 수 있습니다.")
        List<@Positive(message = "여행 번호가 올바르지 않습니다.") Long> featuredTravelIds) {
}
