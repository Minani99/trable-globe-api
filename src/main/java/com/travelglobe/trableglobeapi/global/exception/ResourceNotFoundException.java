package com.travelglobe.trableglobeapi.global.exception;

/**
 * Thrown when an addressed resource does not exist or is not publicly visible.
 *
 * <p>Hidden and missing resources intentionally produce the same response so that a
 * private profile cannot be discovered by probing.
 */
public class ResourceNotFoundException extends RuntimeException {

    public ResourceNotFoundException(String message) {
        super(message);
    }

    public static ResourceNotFoundException profile(String username) {
        return new ResourceNotFoundException("프로필을 찾을 수 없습니다: " + username);
    }

    public static ResourceNotFoundException travel(Long travelId) {
        return new ResourceNotFoundException("여행 기록을 찾을 수 없습니다: " + travelId);
    }

    public static ResourceNotFoundException country(String countryCode) {
        return new ResourceNotFoundException("국가를 찾을 수 없습니다: " + countryCode);
    }
}
