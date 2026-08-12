package com.travelglobe.trableglobeapi.travel.dto.write;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

/** Stable country identity supplied by the frontend's ISO catalog. */
public record CountryWriteRequest(
        @NotBlank @Pattern(regexp = "^[A-Za-z]{2}$", message = "2자리 국가 코드를 확인해 주세요.")
        String iso2Code,
        @NotBlank @Pattern(regexp = "^[A-Za-z]{3}$", message = "3자리 국가 코드를 확인해 주세요.")
        String iso3Code,
        @NotBlank @Size(max = 100) String nameEn,
        @NotBlank @Size(max = 100) String nameKo,
        @NotNull @DecimalMin("-90") @DecimalMax("90") BigDecimal latitude,
        @NotNull @DecimalMin("-180") @DecimalMax("180") BigDecimal longitude) {
}
