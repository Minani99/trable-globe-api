package com.travelglobe.trableglobeapi.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

/**
 * The authentication contract, exercised over HTTP.
 *
 * <p>Registration, sign-in and session handling shipped without a single test, which left
 * the properties that matter most here confirmed only by hand: that a wrong password is
 * refused, that a revoked session stops working, that a reset link cannot be replayed.
 * Each test below pins one of those.
 *
 * <p>Every test registers its own account rather than rolling back, so the flows run
 * against committed state exactly as they do in production.
 */
@SpringBootTest
@AutoConfigureMockMvc
class AuthApiTest {

    private static final AtomicInteger SEQUENCE = new AtomicInteger();
    private static final String PASSWORD = "a-long-enough-password";

    @Autowired
    private MockMvc mockMvc;

    // --- registration ------------------------------------------------------

    @Test
    @DisplayName("회원가입은 세션 토큰과 회원 정보를 반환한다")
    void registrationIssuesASession() throws Exception {
        String username = nextUsername();

        postJson("/api/auth/register", registerBody(username, email(username)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.token").isNotEmpty())
                .andExpect(jsonPath("$.data.expiresAt").isNotEmpty())
                .andExpect(jsonPath("$.data.member.username").value(username));
    }

    @Test
    @DisplayName("이미 쓰는 사용자명은 409 로 거절한다")
    void rejectsADuplicateUsername() throws Exception {
        String taken = nextUsername();
        register(taken);

        postJson("/api/auth/register", registerBody(taken, email(nextUsername())))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("CONFLICT"));
    }

    @Test
    @DisplayName("이미 쓰는 이메일은 409 로 거절한다")
    void rejectsADuplicateEmail() throws Exception {
        String existing = nextUsername();
        register(existing);

        postJson("/api/auth/register", registerBody(nextUsername(), email(existing)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("CONFLICT"));
    }

    @Test
    @DisplayName("짧은 비밀번호는 400 과 필드 오류로 거절한다")
    void rejectsAPasswordThatIsTooShort() throws Exception {
        String username = nextUsername();
        String body = """
                {"username":"%s","displayName":"테스터","email":"%s","password":"short"}
                """.formatted(username, email(username));

        postJson("/api/auth/register", body)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("VALIDATION_FAILED"))
                .andExpect(jsonPath("$.error.fieldErrors[*].field").value(hasItem("password")));
    }

    @Test
    @DisplayName("HTML처럼 보이는 보여질 이름은 400으로 거절한다")
    void rejectsMarkupInDisplayName() throws Exception {
        String username = nextUsername();
        String body = """
                {"username":"%s","displayName":"<script>alert(1)</script>","email":"%s","password":"%s"}
                """.formatted(username, email(username), PASSWORD);

        postJson("/api/auth/register", body)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("VALIDATION_FAILED"))
                .andExpect(jsonPath("$.error.fieldErrors[*].field").value(hasItem("displayName")));
    }

    @Test
    @DisplayName("한 글자 보여질 이름과 밑줄로 시작하는 사용자명도 가입할 수 있다")
    void acceptsShortUnicodeDisplayNamesAndUnderscoreHandles() throws Exception {
        String suffix = String.valueOf(SEQUENCE.incrementAndGet());
        String username = "_" + suffix;
        String body = """
                {"username":"%s","displayName":"린","email":"%s","password":"%s"}
                """.formatted(username, email("short" + suffix), PASSWORD);

        postJson("/api/auth/register", body)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.member.username").value(username))
                .andExpect(jsonPath("$.data.member.displayName").value("린"));
    }

    @Test
    @DisplayName("서비스 경로와 겹치는 사용자명은 가입 전에 이유를 알려준다")
    void rejectsReservedUsernames() throws Exception {
        postJson("/api/auth/register", registerBody("studio", email(nextUsername())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("INVALID_REQUEST"))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("서비스")));
    }

    @Test
    @DisplayName("사용자명 사용 가능 여부를 형식과 중복까지 확인한다")
    void checksUsernameAvailability() throws Exception {
        String taken = nextUsername();
        register(taken);

        mockMvc.perform(get("/api/auth/username-availability").param("username", taken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.available").value(false))
                .andExpect(jsonPath("$.data.message").value("이미 사용 중인 사용자명입니다."));
        mockMvc.perform(get("/api/auth/username-availability").param("username", "globe"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.available").value(false))
                .andExpect(jsonPath("$.data.message").value(org.hamcrest.Matchers.containsString("서비스")));
    }

    // --- sign-in -----------------------------------------------------------

    @Test
    @DisplayName("올바른 자격 증명으로 로그인된다")
    void signsInWithCorrectCredentials() throws Exception {
        String username = nextUsername();
        register(username);

        postJson("/api/auth/login", loginBody(email(username), PASSWORD))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.token").isNotEmpty())
                .andExpect(jsonPath("$.data.member.username").value(username));
    }

    @Test
    @DisplayName("비밀번호가 틀리면 401 이고 토큰을 주지 않는다")
    void refusesAWrongPassword() throws Exception {
        String username = nextUsername();
        register(username);

        postJson("/api/auth/login", loginBody(email(username), "wrong-password-entirely"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("AUTHENTICATION_FAILED"))
                .andExpect(jsonPath("$.data").doesNotExist());
    }

    @Test
    @DisplayName("없는 이메일과 틀린 비밀번호가 같은 응답을 준다")
    void doesNotRevealWhetherAnEmailExists() throws Exception {
        String username = nextUsername();
        register(username);

        String wrongPassword = bodyOf(postJson("/api/auth/login", loginBody(email(username), "not-the-password"))
                .andExpect(status().isUnauthorized()));
        String unknownEmail = bodyOf(postJson("/api/auth/login", loginBody(email(nextUsername()), PASSWORD))
                .andExpect(status().isUnauthorized()));

        // A different status or message would turn the sign-in form into a way to test
        // whether any given address has an account here.
        assertThat(unknownEmail).isEqualTo(wrongPassword);
    }

    // --- sessions ----------------------------------------------------------

    @Test
    @DisplayName("토큰 없이 내 정보를 조회하면 401 이다")
    void currentMemberRequiresAToken() throws Exception {
        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("AUTHENTICATION_REQUIRED"));
    }

    @Test
    @DisplayName("위조된 토큰은 401 이다")
    void rejectsAForgedToken() throws Exception {
        mockMvc.perform(get("/api/auth/me").header("Authorization", "Bearer not-a-real-token"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("AUTHENTICATION_REQUIRED"));
    }

    @Test
    @DisplayName("발급받은 토큰으로 내 정보를 조회한다")
    void returnsTheCurrentMemberForAValidToken() throws Exception {
        String username = nextUsername();
        String token = register(username);

        mockMvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.username").value(username));
    }

    @Test
    @DisplayName("현재 비밀번호로 사용자명과 로그인 이메일을 수정할 수 있다")
    void updatesRegistrationIdentityWithoutDeletingTheAccount() throws Exception {
        String username = nextUsername();
        String token = register(username);
        String nextHandle = nextUsername();
        String nextEmail = email(nextHandle);

        mockMvc.perform(patch("/api/auth/account")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"username":"%s","email":"%s","currentPassword":"%s"}
                                """.formatted(nextHandle, nextEmail, PASSWORD)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.username").value(nextHandle))
                .andExpect(jsonPath("$.data.email").value(nextEmail))
                .andExpect(jsonPath("$.data.emailVerified").value(false));

        mockMvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.username").value(nextHandle));
        postJson("/api/auth/login", loginBody(email(username), PASSWORD))
                .andExpect(status().isUnauthorized());
        postJson("/api/auth/login", loginBody(nextEmail, PASSWORD))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("가입 정보 수정은 현재 비밀번호가 맞아야 한다")
    void accountIdentityUpdateRequiresCurrentPassword() throws Exception {
        String username = nextUsername();
        String token = register(username);

        mockMvc.perform(patch("/api/auth/account")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"username":"%s","email":"%s","currentPassword":"wrong-password"}
                                """.formatted(nextUsername(), email(nextUsername()))))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("로그아웃하면 그 토큰은 즉시 무효가 된다")
    void logoutRevokesTheSession() throws Exception {
        String token = register(nextUsername());

        mockMvc.perform(post("/api/auth/logout").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("AUTHENTICATION_REQUIRED"));
    }

    // --- password reset ----------------------------------------------------

    @Test
    @DisplayName("없는 이메일로 재설정을 요청해도 가입 여부를 알려주지 않는다")
    void passwordResetDoesNotRevealWhetherAnEmailExists() throws Exception {
        postJson("/api/auth/password/forgot", """
                {"email":"no-such-user@example.com"}
                """)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.message").isNotEmpty())
                .andExpect(jsonPath("$.data.developmentToken").doesNotExist());
    }

    @Test
    @DisplayName("재설정 토큰은 한 번만 쓸 수 있다")
    void aResetTokenCannotBeReplayed() throws Exception {
        String username = nextUsername();
        register(username);
        String resetToken = requestPasswordReset(email(username));

        postJson("/api/auth/password/reset", resetBody(resetToken, "brand-new-password-1"))
                .andExpect(status().isOk());

        // Replaying a leaked link must not hand the account over a second time.
        postJson("/api/auth/password/reset", resetBody(resetToken, "yet-another-password"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("INVALID_REQUEST"));
    }

    @Test
    @DisplayName("비밀번호를 재설정하면 새 비밀번호만 통하고 기존 세션은 끊긴다")
    void resettingThePasswordSwapsCredentialsAndDropsOldSessions() throws Exception {
        String username = nextUsername();
        String sessionBeforeReset = register(username);
        String newPassword = "replacement-password-9";

        postJson("/api/auth/password/reset",
                resetBody(requestPasswordReset(email(username)), newPassword))
                .andExpect(status().isOk());

        postJson("/api/auth/login", loginBody(email(username), PASSWORD))
                .andExpect(status().isUnauthorized());
        postJson("/api/auth/login", loginBody(email(username), newPassword))
                .andExpect(status().isOk());
        // Whoever prompted the reset may already be holding a stolen session.
        mockMvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + sessionBeforeReset))
                .andExpect(status().isUnauthorized());
    }

    // --- account deletion --------------------------------------------------

    @Test
    @DisplayName("비밀번호가 틀리면 계정을 삭제하지 않는다")
    void accountDeletionRequiresThePassword() throws Exception {
        String username = nextUsername();
        String token = register(username);

        mockMvc.perform(delete("/api/auth/account")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"password":"definitely-not-mine"}
                                """))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
    }

    // --- helpers -----------------------------------------------------------

    /** Unique per test so accounts never collide across the shared context. */
    private static String nextUsername() {
        return "tester" + SEQUENCE.incrementAndGet() + "x";
    }

    private static String email(String username) {
        return username + "@example.com";
    }

    /** Registers the account and returns its session token. */
    private String register(String username) throws Exception {
        ResultActions result = postJson("/api/auth/register", registerBody(username, email(username)))
                .andExpect(status().isOk());
        return JsonPath.read(bodyOf(result), "$.data.token");
    }

    /** Returns the one-time reset token the API exposes outside production. */
    private String requestPasswordReset(String address) throws Exception {
        ResultActions result = postJson("/api/auth/password/forgot",
                """
                        {"email":"%s"}
                        """.formatted(address))
                .andExpect(status().isOk());
        return JsonPath.read(bodyOf(result), "$.data.developmentToken");
    }

    private ResultActions postJson(String path, String body) throws Exception {
        return mockMvc.perform(withJson(post(path), body));
    }

    private static MockHttpServletRequestBuilder withJson(MockHttpServletRequestBuilder builder, String body) {
        return builder.contentType(MediaType.APPLICATION_JSON).content(body);
    }

    private static String bodyOf(ResultActions actions) throws Exception {
        return actions.andReturn().getResponse().getContentAsString();
    }

    private static String registerBody(String username, String address) {
        return """
                {"username":"%s","displayName":"테스터","email":"%s","password":"%s"}
                """.formatted(username, address, PASSWORD);
    }

    private static String loginBody(String address, String password) {
        return """
                {"email":"%s","password":"%s"}
                """.formatted(address, password);
    }

    private static String resetBody(String token, String password) {
        return """
                {"token":"%s","password":"%s"}
                """.formatted(token, password);
    }
}
