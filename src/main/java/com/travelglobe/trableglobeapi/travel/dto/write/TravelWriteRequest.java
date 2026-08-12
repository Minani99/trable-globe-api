package com.travelglobe.trableglobeapi.travel.dto.write;

import com.travelglobe.trableglobeapi.travel.domain.Visibility;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.List;

public record TravelWriteRequest(
        @NotBlank(message = "여행 제목을 입력해 주세요.")
        @Size(max = 120, message = "여행 제목은 120자 이내로 입력해 주세요.")
        String title,
        @Size(max = 2000, message = "여행 소개는 2,000자 이내로 입력해 주세요.")
        String description,
        @NotNull(message = "여행 시작일을 입력해 주세요.") LocalDate startDate,
        @NotNull(message = "여행 종료일을 입력해 주세요.") LocalDate endDate,
        @Size(max = 500, message = "대표 이미지 주소가 너무 깁니다.") String coverImageUrl,
        @NotNull(message = "공개 범위를 선택해 주세요.") Visibility visibility,
        @NotNull @Size(min = 1, max = 100, message = "방문 장소는 1~100개까지 기록할 수 있습니다.")
        List<@Valid TravelPlaceWriteRequest> places,
        @NotNull @Size(max = 100, message = "사진은 100개까지 기록할 수 있습니다.")
        List<@Valid TravelPhotoWriteRequest> photos) {
}
