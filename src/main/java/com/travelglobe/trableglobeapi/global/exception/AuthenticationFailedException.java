package com.travelglobe.trableglobeapi.global.exception;

public class AuthenticationFailedException extends RuntimeException {

    public AuthenticationFailedException() {
        super("이메일 또는 비밀번호가 올바르지 않습니다.");
    }
}
