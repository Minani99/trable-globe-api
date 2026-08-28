package com.travelglobe.trableglobeapi.travel.dto.write;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;

public record TravelPlaceWriteRequest(
        @NotNull @Valid CountryWriteRequest country,
        @Valid CityWriteRequest city,
        @NotBlank(message = "방문 장소를 입력해 주세요.")
        @Size(max = 150, message = "방문 장소는 150자 이내로 입력해 주세요.")
        String placeName,
        @DecimalMin("-90") @DecimalMax("90") BigDecimal latitude,
        @DecimalMin("-180") @DecimalMax("180") BigDecimal longitude,
        LocalDate visitedAt,
        LocalTime startTime,
        @Min(value = 15, message = "장소 체류 시간은 15분 이상이어야 합니다.")
        @Max(value = 1440, message = "장소 체류 시간은 24시간 이하여야 합니다.")
        Integer durationMinutes,
        @Size(max = 1000, message = "장소 메모는 1,000자 이내로 입력해 주세요.")
        String memo) {
}
