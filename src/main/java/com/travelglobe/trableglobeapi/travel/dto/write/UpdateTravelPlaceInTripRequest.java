package com.travelglobe.trableglobeapi.travel.dto.write;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record UpdateTravelPlaceInTripRequest(
        @Size(max = 1000, message = "장소 메모는 1,000자 이내로 입력해 주세요.")
        String memo,
        @NotNull(message = "완료 여부를 선택해 주세요.")
        Boolean completed) {
}
