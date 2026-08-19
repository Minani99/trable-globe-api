package com.travelglobe.trableglobeapi.auth.security;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.regex.Pattern;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Pins the properties a stored password has to keep.
 *
 * <p>These are the guarantees that are easy to destroy in a refactor and impossible to
 * notice by using the app: a hash that stops being salted, or a verifier that starts
 * accepting the wrong password, both look completely normal from the outside.
 */
class PasswordHasherTest {

    /** The encoded form is algorithm$iterations$salt$digest. */
    private static final String FIELD_SEPARATOR = Pattern.quote("$");

    private final PasswordHasher hasher = new PasswordHasher();

    @Test
    @DisplayName("올바른 비밀번호를 통과시킨다")
    void acceptsTheCorrectPassword() {
        String stored = hasher.hash("correct horse battery");

        assertThat(hasher.matches("correct horse battery", stored)).isTrue();
    }

    @Test
    @DisplayName("틀린 비밀번호를 거부한다")
    void rejectsAWrongPassword() {
        String stored = hasher.hash("correct horse battery");

        assertThat(hasher.matches("correct horse batterY", stored)).isFalse();
        assertThat(hasher.matches("", stored)).isFalse();
        assertThat(hasher.matches("완전히 다른 비밀번호", stored)).isFalse();
    }

    @Test
    @DisplayName("같은 비밀번호도 매번 다른 해시가 된다")
    void saltsEveryHashIndependently() {
        String first = hasher.hash("same password twice");
        String second = hasher.hash("same password twice");

        // Equal hashes would mean a shared or missing salt, which lets one precomputed
        // table cover every account at once.
        assertThat(first).isNotEqualTo(second);
        assertThat(hasher.matches("same password twice", first)).isTrue();
        assertThat(hasher.matches("same password twice", second)).isTrue();
    }

    @Test
    @DisplayName("해시에 평문이 남지 않는다")
    void neverStoresThePlaintext() {
        String password = "plaintext-must-not-survive";

        assertThat(hasher.hash(password)).doesNotContain(password);
    }

    @Test
    @DisplayName("저장 형식이 알고리즘과 반복 횟수를 포함한다")
    void storesTheParametersNeededToVerifyLater() {
        // The parameters travel with the hash, so the cost can be raised later without
        // invalidating passwords that were stored under the old setting.
        String[] parts = hasher.hash("any password").split(FIELD_SEPARATOR);

        assertThat(parts).hasSize(4);
        assertThat(parts[0]).isEqualTo("pbkdf2_sha256");
        assertThat(Integer.parseInt(parts[1])).isGreaterThanOrEqualTo(310_000);
    }

    @Test
    @DisplayName("훼손되거나 형식이 깨진 해시는 통과시키지 않는다")
    void rejectsMalformedStoredValues() {
        String[] parts = hasher.hash("original password").split(FIELD_SEPARATOR);
        String tamperedDigest = String.join("$",
                parts[0], parts[1], parts[2], parts[3].substring(1) + "A");

        assertThat(hasher.matches("original password", tamperedDigest)).isFalse();
        assertThat(hasher.matches("original password", "not-a-hash")).isFalse();
        assertThat(hasher.matches("original password", "")).isFalse();
        assertThat(hasher.matches("original password", "md5$1$salt$digest")).isFalse();
    }
}
