package com.travelglobe.trableglobeapi.travel.dto.write;

import com.travelglobe.trableglobeapi.travel.domain.TravelReservationCategory;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

public record TravelReservationWriteRequest(
        @NotBlank(message = "예약 이름을 입력해 주세요.")
        @Size(max = 120, message = "예약 이름은 120자 이내로 입력해 주세요.")
        String title,
        @NotNull(message = "예약 분류를 선택해 주세요.") TravelReservationCategory category,
        @NotNull(message = "이용 날짜를 선택해 주세요.") LocalDate reservationDate,
        @Size(max = 500, message = "예약 메모는 500자 이내로 입력해 주세요.") String memo,
        Boolean confirmed) {
}
