package com.travelglobe.trableglobeapi.member.domain;

import java.util.Set;
import java.util.regex.Pattern;

/** Shared public-handle rules for registration, availability checks and account edits. */
public final class UsernamePolicy {

    public static final String PATTERN = "^[A-Za-z0-9_][A-Za-z0-9._-]{1,29}$";
    public static final String FORMAT_MESSAGE =
            "사용자명은 영문·숫자·밑줄로 시작하고, 영문·숫자·점·밑줄·하이픈으로 2~30자여야 합니다.";

    private static final Pattern VALID_PATTERN = Pattern.compile(PATTERN);
    private static final Set<String> RESERVED = Set.of(
            "_next", "about", "admin", "api", "discover", "feedback", "favicon.ico",
            "forgot-password", "globe", "help", "icon.svg", "login", "privacy", "register",
            "reset-password", "robots.txt", "settings", "sitemap.xml", "studio", "support",
            "terms", "traveler", "verify-email", "www");

    private UsernamePolicy() {
    }

    public static String validationMessage(String rawUsername) {
        String username = Member.normalizeUsername(rawUsername);
        if (username == null || username.isBlank()) {
            return "사용자명을 입력해 주세요.";
        }
        if (!VALID_PATTERN.matcher(username).matches()) {
            return FORMAT_MESSAGE;
        }
        if (RESERVED.contains(username)) {
            return "서비스에서 사용하는 이름이라 다른 사용자명을 선택해 주세요.";
        }
        return null;
    }

    public static boolean isReserved(String rawUsername) {
        String username = Member.normalizeUsername(rawUsername);
        return username != null && RESERVED.contains(username);
    }
}
