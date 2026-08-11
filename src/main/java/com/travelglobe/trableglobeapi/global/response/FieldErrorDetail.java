package com.travelglobe.trableglobeapi.global.response;

/**
 * A single Bean Validation failure, shaped so a form can highlight the offending input.
 *
 * <p>The rejected value is deliberately omitted: it can contain user supplied content
 * that we do not want to echo back into a response body.
 */
public record FieldErrorDetail(String field, String message) {
}
