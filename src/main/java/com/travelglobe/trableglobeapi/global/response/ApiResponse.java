package com.travelglobe.trableglobeapi.global.response;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * Envelope shared by every {@code /api} endpoint.
 *
 * <p>The envelope carries the success flag and an optional human readable message;
 * HTTP status codes still carry the real semantics, so a client can rely on either.
 * {@code error} is only present on failures.
 *
 * @param <T> payload type
 */
public record ApiResponse<T>(
        boolean success,
        T data,
        String message,
        @JsonInclude(JsonInclude.Include.NON_NULL) ApiError error) {

    public static <T> ApiResponse<T> ok(T data) {
        return new ApiResponse<>(true, data, null, null);
    }

    public static <T> ApiResponse<T> ok(T data, String message) {
        return new ApiResponse<>(true, data, message, null);
    }

    public static <T> ApiResponse<T> failure(String message, ApiError error) {
        return new ApiResponse<>(false, null, message, error);
    }
}
