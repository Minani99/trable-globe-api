package com.travelglobe.trableglobeapi.travel.dto.write;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

public record CreateTravelPhotoInTripRequest(
        @NotBlank(message = "사진 주소가 필요합니다.")
        @Size(max = 500, message = "사진 주소는 500자 이내로 입력해 주세요.")
        String imageUrl,
        @Size(max = 300, message = "사진 설명은 300자 이내로 입력해 주세요.")
        String caption,
        LocalDate takenAt,
        Long travelPlaceId) {
}
