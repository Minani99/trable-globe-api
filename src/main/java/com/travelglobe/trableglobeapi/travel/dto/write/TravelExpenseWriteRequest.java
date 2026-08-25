package com.travelglobe.trableglobeapi.travel.dto.write;

import com.travelglobe.trableglobeapi.travel.domain.TravelExpenseCategory;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record TravelExpenseWriteRequest(
        @NotBlank(message = "비용 이름을 입력해 주세요.")
        @Size(max = 120, message = "비용 이름은 120자 이내로 입력해 주세요.")
        String title,
        @NotNull(message = "비용 분류를 선택해 주세요.") TravelExpenseCategory category,
        @NotNull(message = "비용을 입력해 주세요.")
        @DecimalMin(value = "0", message = "비용은 0 이상이어야 합니다.")
        @Digits(integer = 12, fraction = 2, message = "비용 금액을 확인해 주세요.")
        BigDecimal amount,
        Boolean paid) {
}
