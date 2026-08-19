package com.travelglobe.trableglobeapi.global.exception;

/** Thrown when a signed-in member tries to manage another member's content. */
public class AccessDeniedException extends RuntimeException {

    public AccessDeniedException(String message) {
        super(message);
    }
}
