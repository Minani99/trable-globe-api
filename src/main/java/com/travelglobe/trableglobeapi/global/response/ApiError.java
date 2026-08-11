package com.travelglobe.trableglobeapi.global.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;

/**
 * Machine readable failure detail.
 *
 * @param code        stable error code the frontend can branch on
 * @param fieldErrors per-field validation failures, empty for non-validation errors
 */
public record ApiError(
        String code,
        @JsonInclude(JsonInclude.Include.NON_EMPTY) List<FieldErrorDetail> fieldErrors) {

    public static ApiError of(String code) {
        return new ApiError(code, List.of());
    }

    public static ApiError of(String code, List<FieldErrorDetail> fieldErrors) {
        return new ApiError(code, fieldErrors == null ? List.of() : List.copyOf(fieldErrors));
    }
}
