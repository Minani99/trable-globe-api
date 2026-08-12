package com.travelglobe.trableglobeapi.travel.dto.write;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

public record TravelPhotoWriteRequest(
        @NotBlank(message = "사진 주소를 입력해 주세요.")
        @Size(max = 500, message = "사진 주소가 너무 깁니다.")
        String imageUrl,
        @Size(max = 300, message = "사진 설명은 300자 이내로 입력해 주세요.")
        String caption,
        LocalDate takenAt,
        @Min(value = 0, message = "연결할 장소 순서를 확인해 주세요.") Integer placeIndex) {
}
