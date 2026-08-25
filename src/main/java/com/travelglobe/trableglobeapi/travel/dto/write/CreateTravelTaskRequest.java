package com.travelglobe.trableglobeapi.travel.dto.write;

import com.travelglobe.trableglobeapi.travel.domain.TravelTaskCategory;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateTravelTaskRequest(
        @NotBlank(message = "준비할 내용을 입력해 주세요.")
        @Size(max = 120, message = "준비 항목은 120자 이내로 입력해 주세요.")
        String title,
        @NotNull(message = "준비 항목의 분류를 선택해 주세요.")
        TravelTaskCategory category) {
}
