package com.travelglobe.trableglobeapi.global.exception;

/**
 * Thrown when a request is well formed but semantically unusable.
 */
public class InvalidRequestException extends RuntimeException {

    public InvalidRequestException(String message) {
        super(message);
    }
}
