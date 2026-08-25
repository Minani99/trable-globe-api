package com.travelglobe.trableglobeapi.travel.dto.write;

import com.travelglobe.trableglobeapi.travel.domain.TravelCurrency;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record UpdateTravelBudgetRequest(
        @NotNull(message = "총예산을 입력해 주세요.")
        @DecimalMin(value = "0", message = "총예산은 0 이상이어야 합니다.")
        @Digits(integer = 12, fraction = 2, message = "총예산 금액을 확인해 주세요.")
        BigDecimal targetAmount,
        @NotNull(message = "통화를 선택해 주세요.") TravelCurrency currency) {
}
