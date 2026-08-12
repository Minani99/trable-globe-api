package com.travelglobe.trableglobeapi.travel.dto.write;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;

public record TravelPlaceWriteRequest(
        @NotNull @Valid CountryWriteRequest country,
        @Valid CityWriteRequest city,
        @NotBlank(message = "방문 장소를 입력해 주세요.")
        @Size(max = 150, message = "방문 장소는 150자 이내로 입력해 주세요.")
        String placeName,
        @DecimalMin("-90") @DecimalMax("90") BigDecimal latitude,
        @DecimalMin("-180") @DecimalMax("180") BigDecimal longitude,
        LocalDate visitedAt,
        @Size(max = 1000, message = "장소 메모는 1,000자 이내로 입력해 주세요.")
        String memo) {
}
