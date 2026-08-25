package com.travelglobe.trableglobeapi.travel.dto.write;

import jakarta.validation.constraints.NotNull;

public record UpdateTravelTaskRequest(
        @NotNull(message = "완료 여부를 선택해 주세요.") Boolean completed) {
}
