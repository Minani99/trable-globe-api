package com.travelglobe.trableglobeapi.global.exception;

/**
 * Stable error codes returned in {@code error.code}.
 *
 * <p>Frontend behaviour keys off these values, so existing constants must not be renamed.
 */
public enum ErrorCode {

    RESOURCE_NOT_FOUND,
    INVALID_REQUEST,
    VALIDATION_FAILED,
    AUTHENTICATION_REQUIRED,
    AUTHENTICATION_FAILED,
    ACCESS_DENIED,
    CONFLICT,
    INTERNAL_ERROR
}
