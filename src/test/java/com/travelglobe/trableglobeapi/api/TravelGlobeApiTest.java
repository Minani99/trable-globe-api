package com.travelglobe.trableglobeapi.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import java.util.Comparator;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

/**
 * End-to-end HTTP checks over the seeded database: routing, the response envelope and
 * the error contract the frontend depends on.
 */
@SpringBootTest
@AutoConfigureMockMvc
class TravelGlobeApiTest {

    @Autowired
    private MockMvc mockMvc;

    /** Performs the request, asserts 200 and hands back the raw body. */
    private String okBody(MockHttpServletRequestBuilder request) throws Exception {
        return mockMvc.perform(request)
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
    }

    /** Number of elements in the data array of a collection endpoint. */
    private int dataLength(String path) throws Exception {
        return JsonPath.<List<Object>>read(okBody(get(path)), "$.data").size();
    }

    /** Trips on the full profile list that include the given country. */
    private int countTravelsVisiting(String iso2Code) throws Exception {
        String all = okBody(get("/api/profiles/traveler/travels"));
        int total = JsonPath.<List<Object>>read(all, "$.data").size();
        int matching = 0;
        for (int index = 0; index < total; index++) {
            if (JsonPath.<List<String>>read(all, "$.data[" + index + "].countries[*].iso2Code")
                    .contains(iso2Code)) {
                matching++;
            }
        }
        return matching;
    }

    @Test
    @DisplayName("GET /api/health 는 UP 을 반환한다")
    void healthReportsUp() throws Exception {
        mockMvc.perform(get("/api/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("UP"))
                .andExpect(jsonPath("$.data.database").value("UP"))
                .andExpect(header().exists("X-Request-ID"));
    }

    @Test
    @DisplayName("GET /api/health/live returns liveness without querying dependencies")
    void livenessReportsUpAndKeepsTrustedRequestId() throws Exception {
        mockMvc.perform(get("/api/health/live").header("X-Request-ID", "smoke-check-01"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("UP"))
                .andExpect(jsonPath("$.data.database").value("NOT_CHECKED"))
                .andExpect(header().string("X-Request-ID", "smoke-check-01"));
    }

    @Test
    @DisplayName("GET /api/profiles/{username} 은 프로필과 통계를 반환한다")
    void returnsProfile() throws Exception {
        String profile = okBody(get("/api/profiles/traveler"));

        // Totals are checked against the collections they summarise rather than pinned
        // to a number. A hard-coded total only records what the seed held the day it
        // was written, breaks the build the next time the seed grows, and never once
        // checks that the headline figures agree with the data behind them.
        assertThat(JsonPath.<String>read(profile, "$.data.username")).isEqualTo("traveler");
        assertThat(JsonPath.<Integer>read(profile, "$.data.statistics.countryCount"))
                .isPositive()
                .isEqualTo(dataLength("/api/profiles/traveler/countries"));
        assertThat(JsonPath.<Integer>read(profile, "$.data.statistics.travelCount"))
                .isPositive()
                .isEqualTo(dataLength("/api/profiles/traveler/travels"));
        assertThat(JsonPath.<Integer>read(profile, "$.data.statistics.cityCount")).isPositive();
    }

    @Test
    @DisplayName("알 수 없는 사용자는 404 와 오류 코드를 반환한다")
    void unknownProfileReturnsNotFound() throws Exception {
        mockMvc.perform(get("/api/profiles/nobody"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("RESOURCE_NOT_FOUND"));
    }

    @Test
    @DisplayName("GET /api/profiles/{username}/countries 는 지구본 마커 데이터를 반환한다")
    void returnsVisitedCountries() throws Exception {
        String response = okBody(get("/api/profiles/traveler/countries"));

        assertThat(JsonPath.<List<String>>read(response, "$.data[*].iso2Code")).isNotEmpty();
        assertThat(JsonPath.<List<Number>>read(response, "$.data[*].latitude")).doesNotContainNull();
        assertThat(JsonPath.<List<Number>>read(response, "$.data[*].longitude")).doesNotContainNull();
        // The globe draws the busiest countries first, so the order is part of the contract.
        assertThat(JsonPath.<List<Integer>>read(response, "$.data[*].travelCount"))
                .isNotEmpty()
                .isSortedAccordingTo(Comparator.reverseOrder());
    }

    @Test
    @DisplayName("GET /api/profiles/{username}/travels 는 최신 여행부터 반환한다")
    void returnsTravels() throws Exception {
        String response = okBody(get("/api/profiles/traveler/travels"));

        // ISO dates sort lexicographically, so this states the real "newest first"
        // claim rather than naming whichever trip the seed happens to start with.
        assertThat(JsonPath.<List<String>>read(response, "$.data[*].startDate"))
                .isNotEmpty()
                .isSortedAccordingTo(Comparator.reverseOrder());
        assertThat(JsonPath.<List<Integer>>read(response, "$.data[*].durationDays"))
                .isNotEmpty()
                .allSatisfy(days -> assertThat(days).isPositive());

        mockMvc.perform(get("/api/profiles/traveler/travels"))
                .andExpect(jsonPath("$.data[0].primaryCountry.nameKo").isNotEmpty())
                .andExpect(jsonPath("$.data[0].routePoints[0].label").isNotEmpty())
                .andExpect(jsonPath("$.data[0].routePoints[0].latitude").isNumber())
                .andExpect(jsonPath("$.data[0].routePoints[0].longitude").isNumber());
    }

    @Test
    @DisplayName("GET /api/profiles/{username}/countries/{code}/travels 는 국가별 여행을 반환한다")
    void returnsTravelsByCountry() throws Exception {
        String response = okBody(get("/api/profiles/traveler/countries/JP/travels"));
        int returned = JsonPath.<List<Object>>read(response, "$.data").size();

        assertThat(returned).isPositive();
        // What the filter actually promises: every trip returned visited Japan, and no
        // trip that visited Japan was left out.
        for (int index = 0; index < returned; index++) {
            assertThat(JsonPath.<List<String>>read(response, "$.data[" + index + "].countries[*].iso2Code"))
                    .as("trip at index %d", index)
                    .contains("JP");
        }
        assertThat(returned).isEqualTo(countTravelsVisiting("JP"));
    }

    @Test
    @DisplayName("잘못된 형식의 국가 코드는 400 을 반환한다")
    void malformedCountryCodeIsRejected() throws Exception {
        mockMvc.perform(get("/api/profiles/traveler/countries/JAPAN/travels"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("INVALID_REQUEST"));
    }

    @Test
    @DisplayName("GET /api/travels/{id} 는 장소, 사진, 이전/다음 여행을 포함한다")
    void returnsTravelDetail() throws Exception {
        String list = okBody(get("/api/profiles/traveler/travels"));
        // The newest trip is first; its id is what the profile page would link to.
        Object travelId = JsonPath.read(list, "$.data[0].id");

        // Expectations come from the list itself, so this checks that the two views
        // agree. A detail page contradicting the card that linked to it is the bug
        // worth catching here - not whichever trip the seed puts first.
        mockMvc.perform(get("/api/travels/" + travelId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.title").value(JsonPath.<String>read(list, "$.data[0].title")))
                .andExpect(jsonPath("$.data.owner.username").value("traveler"))
                .andExpect(jsonPath("$.data.places.length()")
                        .value(JsonPath.<Integer>read(list, "$.data[0].placeCount")))
                .andExpect(jsonPath("$.data.places[0].latitude").isNumber())
                .andExpect(jsonPath("$.data.photos.length()")
                        .value(JsonPath.<Integer>read(list, "$.data[0].photoCount")))
                // Newest trip: nothing newer, but an older one exists.
                .andExpect(jsonPath("$.data.nextTravel").doesNotExist())
                .andExpect(jsonPath("$.data.previousTravel.title")
                        .value(JsonPath.<String>read(list, "$.data[1].title")));
    }

    @Test
    @DisplayName("존재하지 않는 여행은 404 를 반환한다")
    void unknownTravelReturnsNotFound() throws Exception {
        mockMvc.perform(get("/api/travels/999999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code").value("RESOURCE_NOT_FOUND"));
    }

    @Test
    @DisplayName("루트 경로는 API 안내를 반환한다")
    void rootDescribesTheService() throws Exception {
        mockMvc.perform(get("/"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.service").value("Travel Globe API"))
                .andExpect(jsonPath("$.data.endpoints").isNotEmpty());
    }

    @Test
    @DisplayName("매핑되지 않은 경로는 500 이 아니라 404 를 반환한다")
    void unmappedPathReturnsNotFoundRatherThanServerError() throws Exception {
        mockMvc.perform(get("/favicon.ico"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("RESOURCE_NOT_FOUND"));
    }

    @Test
    @DisplayName("회원가입 후 자신의 프로필과 여행을 생성·조회·수정·삭제할 수 있다")
    void accountAndOwnedTravelCrud() throws Exception {
        String registerBody = """
                {
                  "username": "archive_writer",
                  "displayName": "여행 기록자",
                  "email": "writer@example.com",
                  "password": "correct-horse-42"
                }
                """;

        String registerResponse = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registerBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.member.username").value("archive_writer"))
                .andExpect(jsonPath("$.data.member.email").value("writer@example.com"))
                .andExpect(jsonPath("$.data.member.passwordHash").doesNotExist())
                .andReturn().getResponse().getContentAsString();
        String token = stringValue(registerResponse, "token");

        mockMvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.displayName").value("여행 기록자"));

        mockMvc.perform(patch("/api/auth/profile")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"displayName":"느린 여행자","bio":"도시를 오래 걷습니다.","profileImageUrl":null}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.displayName").value("느린 여행자"));

        String createResponse = mockMvc.perform(post("/api/private/travels")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(travelPayload("서울의 하루", "PUBLIC")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.owner.username").value("archive_writer"))
                .andExpect(jsonPath("$.data.places[0].country.iso2Code").value("KR"))
                .andReturn().getResponse().getContentAsString();
        long travelId = Long.parseLong(numberValue(createResponse, "id"));

        mockMvc.perform(get("/api/private/travels/" + travelId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.title").value("서울의 하루"));

        mockMvc.perform(put("/api/private/travels/" + travelId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(travelPayload("서울, 다시", "PRIVATE")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.title").value("서울, 다시"))
                .andExpect(jsonPath("$.data.visibility").value("PRIVATE"));

        mockMvc.perform(get("/api/travels/" + travelId))
                .andExpect(status().isNotFound());

        mockMvc.perform(delete("/api/private/travels/" + travelId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/private/travels/" + travelId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());

        mockMvc.perform(post("/api/auth/logout").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("AUTHENTICATION_REQUIRED"));
    }

    @Test
    @DisplayName("이메일 인증·비밀번호 재설정·계정 삭제가 일회용 토큰으로 동작한다")
    void accountSecurityLifecycle() throws Exception {
        String email = "secure@example.com";
        String registerResponse = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username":"secure_traveler",
                                  "displayName":"안전한 여행자",
                                  "email":"secure@example.com",
                                  "password":"original-password-42"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.member.emailVerified").value(false))
                .andReturn().getResponse().getContentAsString();
        String firstSession = stringValue(registerResponse, "token");

        String verificationResponse = mockMvc.perform(post("/api/auth/email-verification")
                        .header("Authorization", "Bearer " + firstSession))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.developmentToken").isNotEmpty())
                .andReturn().getResponse().getContentAsString();
        String verificationToken = stringValue(verificationResponse, "developmentToken");

        mockMvc.perform(post("/api/auth/email-verification/confirm")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\":\"" + verificationToken + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.emailVerified").value(true));
        mockMvc.perform(post("/api/auth/email-verification/confirm")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\":\"" + verificationToken + "\"}"))
                .andExpect(status().isBadRequest());

        String forgotResponse = mockMvc.perform(post("/api/auth/password/forgot")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("가입된 이메일이라면 비밀번호 재설정 링크를 보냈습니다."))
                .andReturn().getResponse().getContentAsString();
        String resetToken = stringValue(forgotResponse, "developmentToken");

        mockMvc.perform(post("/api/auth/password/reset")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\":\"" + resetToken + "\",\"password\":\"renewed-password-42\"}"))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + firstSession))
                .andExpect(status().isUnauthorized());

        String loginResponse = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"renewed-password-42\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.member.emailVerified").value(true))
                .andReturn().getResponse().getContentAsString();
        String currentSession = stringValue(loginResponse, "token");

        mockMvc.perform(post("/api/private/travels")
                        .header("Authorization", "Bearer " + currentSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(travelPayload("삭제될 여행", "PUBLIC")))
                .andExpect(status().isCreated());
        mockMvc.perform(delete("/api/auth/account")
                        .header("Authorization", "Bearer " + currentSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"password\":\"renewed-password-42\"}"))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + currentSession))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/profiles/secure_traveler"))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("인증 토큰이 없으면 개인 쓰기 API를 사용할 수 없다")
    void privateWritesRequireAuthentication() throws Exception {
        mockMvc.perform(post("/api/private/travels")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("AUTHENTICATION_REQUIRED"));
    }

    @Test
    @DisplayName("끝나지 않은 여행이나 미정 장소가 있는 계획은 공개 기록으로 전환할 수 없다")
    void publicRecordsRequireFinishedTravelAndRealPlaces() throws Exception {
        String registerResponse = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username":"record_guard",
                                  "displayName":"기록 점검자",
                                  "email":"record-guard@example.com",
                                  "password":"record-guard-password-42"
                                }
                                """))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        String token = stringValue(registerResponse, "token");

        mockMvc.perform(post("/api/private/travels")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(futureTravelPayload("아직 떠나지 않은 여행", "PUBLIC")))
                .andExpect(status().isBadRequest());

        mockMvc.perform(post("/api/private/travels")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(travelPayload("미완성 계획", "PUBLIC")
                                .replace("서울숲", "1일차 · 장소를 골라주세요")))
                .andExpect(status().isBadRequest());

        mockMvc.perform(post("/api/private/travels")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(travelPayload("종류만 정한 계획", "PUBLIC")
                                .replace("서울숲", "1일차 · 관광을 골라주세요")))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("여행 계획에는 체크리스트와 예산·예약 보드가 생기고 소셜 반응은 최근 활동으로 모인다")
    void planningTasksAndActivityFeed() throws Exception {
        String ownerResponse = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username":"activity_owner",
                                  "displayName":"활동을 받는 여행자",
                                  "email":"activity-owner@example.com",
                                  "password":"activity-password-42"
                                }
                                """))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        String ownerToken = stringValue(ownerResponse, "token");

        String planResponse = mockMvc.perform(post("/api/private/travels")
                        .header("Authorization", "Bearer " + ownerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(futureTravelPayload("체크할 다음 여행", "PRIVATE")))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        long planId = Long.parseLong(numberValue(planResponse, "id"));

        String tasksResponse = mockMvc.perform(get("/api/private/travels/" + planId + "/tasks")
                        .header("Authorization", "Bearer " + ownerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(6))
                .andExpect(jsonPath("$.data[0].title").value("항공·교통편 확인"))
                .andReturn().getResponse().getContentAsString();
        long firstTaskId = Long.parseLong(numberValue(tasksResponse, "id"));

        mockMvc.perform(patch("/api/private/travels/" + planId + "/tasks/" + firstTaskId)
                        .header("Authorization", "Bearer " + ownerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"completed\":true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].completed").value(true));

        mockMvc.perform(post("/api/private/travels/" + planId + "/tasks")
                        .header("Authorization", "Bearer " + ownerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"공항철도 예약\",\"category\":\"RESERVATION\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.length()").value(7))
                .andExpect(jsonPath("$.data[6].title").value("공항철도 예약"));

        mockMvc.perform(get("/api/private/travels/" + planId + "/planning")
                        .header("Authorization", "Bearer " + ownerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.targetAmount").value(0))
                .andExpect(jsonPath("$.data.currency").value("KRW"))
                .andExpect(jsonPath("$.data.expenses.length()").value(0))
                .andExpect(jsonPath("$.data.reservations.length()").value(0));

        mockMvc.perform(patch("/api/private/travels/" + planId + "/planning/budget")
                        .header("Authorization", "Bearer " + ownerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"targetAmount\":1500000,\"currency\":\"KRW\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.targetAmount").value(1500000))
                .andExpect(jsonPath("$.data.remainingAmount").value(1500000));

        String expenseResponse = mockMvc.perform(post("/api/private/travels/" + planId + "/planning/expenses")
                        .header("Authorization", "Bearer " + ownerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"왕복 항공권","category":"TRANSPORT","amount":450000,"paid":false}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.estimatedAmount").value(450000))
                .andExpect(jsonPath("$.data.remainingAmount").value(1050000))
                .andReturn().getResponse().getContentAsString();
        long expenseId = Long.parseLong(numberValue(expenseResponse, "id"));

        mockMvc.perform(patch("/api/private/travels/" + planId + "/planning/expenses/" + expenseId)
                        .header("Authorization", "Bearer " + ownerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"왕복 항공권","category":"TRANSPORT","amount":450000,"paid":true}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.paidAmount").value(450000))
                .andExpect(jsonPath("$.data.expenses[0].paid").value(true));

        mockMvc.perform(post("/api/private/travels/" + planId + "/planning/reservations")
                        .header("Authorization", "Bearer " + ownerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"기간 밖 예약","category":"STAY","reservationDate":"2099-07-31",
                                 "memo":null,"confirmed":false}
                                """))
                .andExpect(status().isBadRequest());

        String reservationResponse = mockMvc.perform(post("/api/private/travels/" + planId + "/planning/reservations")
                        .header("Authorization", "Bearer " + ownerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"도쿄 호텔 체크인","category":"STAY","reservationDate":"2099-08-01",
                                 "memo":"오후 3시","confirmed":false}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.reservations[0].title").value("도쿄 호텔 체크인"))
                .andReturn().getResponse().getContentAsString();
        long reservationId = Long.parseLong(numberValue(reservationResponse, "id"));

        mockMvc.perform(patch("/api/private/travels/" + planId + "/planning/reservations/" + reservationId)
                        .header("Authorization", "Bearer " + ownerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"도쿄 호텔 체크인","category":"STAY","reservationDate":"2099-08-01",
                                 "memo":"오후 3시","confirmed":true}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.reservations[0].confirmed").value(true));

        String publicTravelResponse = mockMvc.perform(post("/api/private/travels")
                        .header("Authorization", "Bearer " + ownerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(travelPayload("반응을 받을 여행", "PUBLIC")))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        long publicTravelId = Long.parseLong(numberValue(publicTravelResponse, "id"));

        String actorResponse = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username":"activity_actor",
                                  "displayName":"반응을 남긴 여행자",
                                  "email":"activity-actor@example.com",
                                  "password":"activity-password-42"
                                }
                                """))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        String actorToken = stringValue(actorResponse, "token");

        mockMvc.perform(post("/api/private/discovery/profiles/activity_owner/follow")
                        .header("Authorization", "Bearer " + actorToken))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/private/travels/" + publicTravelId + "/likes")
                        .header("Authorization", "Bearer " + actorToken))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/private/travels/" + publicTravelId + "/comments")
                        .header("Authorization", "Bearer " + actorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"저도 가보고 싶어요!\"}"))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/private/activity")
                        .header("Authorization", "Bearer " + ownerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(3))
                .andExpect(jsonPath("$.data[?(@.type == 'FOLLOW')].actor.username").value(hasItem("activity_actor")))
                .andExpect(jsonPath("$.data[?(@.type == 'LIKE')].travelTitle").value(hasItem("반응을 받을 여행")))
                .andExpect(jsonPath("$.data[?(@.type == 'COMMENT')].preview").value(hasItem("저도 가보고 싶어요!")));
    }

    @Test
    @DisplayName("회원 검색과 추천에서 다른 여행자를 팔로우할 수 있다")
    void memberDiscoveryCreatesFollowConnections() throws Exception {
        String seekerResponse = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"username":"discover_seeker","displayName":"검색하는 여행자",
                                 "email":"discover-seeker@example.com","password":"discover-password-42"}
                                """))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        String seekerToken = stringValue(seekerResponse, "token");

        String targetResponse = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"username":"discover_target","displayName":"서울 산책가",
                                 "email":"discover-target@example.com","password":"discover-password-42"}
                                """))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        String targetToken = stringValue(targetResponse, "token");

        mockMvc.perform(patch("/api/auth/profile")
                        .header("Authorization", "Bearer " + targetToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"displayName":"서울 산책가","bio":"서울의 골목과 공원을 기록합니다.",
                                 "profileImageUrl":null}
                                """))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/private/travels")
                        .header("Authorization", "Bearer " + seekerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(travelPayload("나의 서울", "PUBLIC")))
                .andExpect(status().isCreated());
        mockMvc.perform(post("/api/private/travels")
                        .header("Authorization", "Bearer " + targetToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(travelPayload("산책가의 서울", "PUBLIC")))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/private/discovery/search")
                        .header("Authorization", "Bearer " + seekerToken)
                        .param("query", "산책가"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].username").value("discover_target"))
                .andExpect(jsonPath("$.data[0].cityCount").value(1))
                .andExpect(jsonPath("$.data[0].recentDestinations").value(hasItem("서울")))
                .andExpect(jsonPath("$.data[0].worldCountries[0].iso2Code").value("KR"))
                .andExpect(jsonPath("$.data[0].sharedCountryCount").value(1))
                .andExpect(jsonPath("$.data[0].following").value(false));

        mockMvc.perform(get("/api/discovery/search").param("query", "discover_target"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].username").value("discover_target"))
                .andExpect(jsonPath("$.data[0].following").value(false));

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"username":"discover_empty","displayName":"기록 없는 친구",
                                 "email":"discover-empty@example.com","password":"discover-password-42"}
                                """))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/discovery/search").param("query", "discover_empty"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].username").value("discover_empty"));

        mockMvc.perform(get("/api/private/discovery/recommendations")
                        .header("Authorization", "Bearer " + seekerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[?(@.username == 'discover_target')]").exists())
                .andExpect(jsonPath("$.data[?(@.username == 'discover_empty')]").isEmpty());

        mockMvc.perform(post("/api/private/discovery/profiles/discover_target/follow")
                        .header("Authorization", "Bearer " + seekerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.following").value(true))
                .andExpect(jsonPath("$.data.followerCount").value(1));

        mockMvc.perform(get("/api/profiles/discover_target"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.followerCount").value(1));

        mockMvc.perform(get("/api/private/discovery/profiles/discover_target/followers")
                        .header("Authorization", "Bearer " + seekerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].username").value("discover_seeker"))
                .andExpect(jsonPath("$.data[0].currentMember").value(true));

        mockMvc.perform(get("/api/discovery/profiles/discover_seeker/following"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].username").value("discover_target"))
                .andExpect(jsonPath("$.data[0].currentMember").value(false));

        mockMvc.perform(delete("/api/private/discovery/profiles/discover_target/follow")
                        .header("Authorization", "Bearer " + seekerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.following").value(false))
                .andExpect(jsonPath("$.data.followerCount").value(0));
    }

    @Test
    @DisplayName("사용자 신고와 차단은 교류를 끊고 검색·추천에서 서로를 제외한다")
    void memberSafetyRestrictsInteractionsAndAcceptsReports() throws Exception {
        String reporterResponse = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"username":"safety_reporter","displayName":"안전한 여행자",
                                 "email":"safety-reporter@example.com","password":"safety-password-42"}
                                """))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        String reporterToken = stringValue(reporterResponse, "token");

        String targetResponse = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"username":"safety_target","displayName":"차단 대상",
                                 "email":"safety-target@example.com","password":"safety-password-42"}
                                """))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        String targetToken = stringValue(targetResponse, "token");

        String travelResponse = mockMvc.perform(post("/api/private/travels")
                        .header("Authorization", "Bearer " + reporterToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(travelPayload("차단으로 보호할 여행", "PUBLIC")))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        long protectedTravelId = Long.parseLong(numberValue(travelResponse, "id"));

        mockMvc.perform(post("/api/private/discovery/profiles/safety_target/follow")
                        .header("Authorization", "Bearer " + reporterToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.following").value(true));

        mockMvc.perform(post("/api/private/discovery/profiles/safety_target/block")
                        .header("Authorization", "Bearer " + reporterToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.blockedByCurrentMember").value(true))
                .andExpect(jsonPath("$.data.interactionRestricted").value(true));

        mockMvc.perform(get("/api/private/discovery/profiles/safety_target")
                        .header("Authorization", "Bearer " + reporterToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.following").value(false))
                .andExpect(jsonPath("$.data.followerCount").value(0));

        mockMvc.perform(get("/api/private/discovery/search")
                        .header("Authorization", "Bearer " + reporterToken)
                        .param("query", "safety_target"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(0));

        mockMvc.perform(post("/api/private/discovery/profiles/safety_reporter/follow")
                        .header("Authorization", "Bearer " + targetToken))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("INVALID_REQUEST"));

        mockMvc.perform(post("/api/private/travels/" + protectedTravelId + "/comments")
                        .header("Authorization", "Bearer " + targetToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"차단 후에는 남길 수 없는 댓글\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("INVALID_REQUEST"));

        mockMvc.perform(post("/api/private/discovery/profiles/safety_target/report")
                        .header("Authorization", "Bearer " + reporterToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"reason":"SPAM","details":"반복적인 홍보 메시지"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.reportId").isNumber())
                .andExpect(jsonPath("$.data.status").value("OPEN"));

        mockMvc.perform(post("/api/private/discovery/profiles/safety_target/report")
                        .header("Authorization", "Bearer " + reporterToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"reason":"OTHER","details":"중복 신고"}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("INVALID_REQUEST"));

        mockMvc.perform(delete("/api/private/discovery/profiles/safety_target/block")
                        .header("Authorization", "Bearer " + reporterToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.blockedByCurrentMember").value(false))
                .andExpect(jsonPath("$.data.interactionRestricted").value(false));

        mockMvc.perform(post("/api/private/discovery/profiles/safety_target/follow")
                        .header("Authorization", "Bearer " + reporterToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.following").value(true));
    }

    @Test
    @DisplayName("공개 여행에서 회원끼리 좋아요와 댓글을 주고받을 수 있다")
    void travelLikesAndCommentsCreateConversation() throws Exception {
        String ownerResponse = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"username":"social_owner","displayName":"여행 주인",
                                 "email":"social-owner@example.com","password":"social-password-42"}
                                """))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        String ownerToken = stringValue(ownerResponse, "token");

        String visitorResponse = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"username":"social_visitor","displayName":"다정한 여행자",
                                 "email":"social-visitor@example.com","password":"social-password-42"}
                                """))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        String visitorToken = stringValue(visitorResponse, "token");

        String travelResponse = mockMvc.perform(post("/api/private/travels")
                        .header("Authorization", "Bearer " + ownerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(travelPayload("함께 이야기할 여행", "PUBLIC")))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        long travelId = Long.parseLong(numberValue(travelResponse, "id"));

        mockMvc.perform(get("/api/travels/" + travelId + "/social"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.likeCount").value(0))
                .andExpect(jsonPath("$.data.commentCount").value(0));

        mockMvc.perform(post("/api/private/travels/" + travelId + "/likes")
                        .header("Authorization", "Bearer " + visitorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.likeCount").value(1))
                .andExpect(jsonPath("$.data.likedByCurrentMember").value(true));

        String commentResponse = mockMvc.perform(post("/api/private/travels/" + travelId + "/comments")
                        .header("Authorization", "Bearer " + visitorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"다음 여행 코스도 궁금해요!\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.commentCount").value(1))
                .andExpect(jsonPath("$.data.comments[0].author.username").value("social_visitor"))
                .andExpect(jsonPath("$.data.comments[0].canDelete").value(true))
                .andReturn().getResponse().getContentAsString();
        long commentId = Long.parseLong(numberValue(commentResponse, "id"));

        mockMvc.perform(get("/api/travels/" + travelId + "/social"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.comments[0].canDelete").value(false));

        mockMvc.perform(delete("/api/private/travels/" + travelId + "/comments/" + commentId)
                        .header("Authorization", "Bearer " + ownerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.commentCount").value(0));
    }

    private static String travelPayload(String title, String visibility) {
        return """
                {
                  "title": "%s",
                  "description": "천천히 걸은 하루",
                  "startDate": "2026-08-01",
                  "endDate": "2026-08-01",
                  "coverImageUrl": null,
                  "visibility": "%s",
                  "places": [{
                    "country": {
                      "iso2Code": "KR", "iso3Code": "KOR",
                      "nameEn": "South Korea", "nameKo": "대한민국",
                      "latitude": 35.907757, "longitude": 127.766922
                    },
                    "city": {
                      "nameEn": "Seoul", "nameKo": "서울",
                      "latitude": 37.566535, "longitude": 126.977969
                    },
                    "placeName": "서울숲",
                    "latitude": 37.544387,
                    "longitude": 127.037442,
                    "visitedAt": "2026-08-01",
                    "memo": "오래 걸었다."
                  }],
                  "photos": []
                }
                """.formatted(title, visibility);
    }

    private static String futureTravelPayload(String title, String visibility) {
        return travelPayload(title, visibility).replace("2026-08-01", "2099-08-01");
    }

    private static String stringValue(String json, String field) {
        String marker = "\"" + field + "\":\"";
        int start = json.indexOf(marker) + marker.length();
        return json.substring(start, json.indexOf('"', start));
    }

    private static String numberValue(String json, String field) {
        String marker = "\"" + field + "\":";
        int start = json.indexOf(marker) + marker.length();
        int end = start;
        while (end < json.length() && Character.isDigit(json.charAt(end))) {
            end++;
        }
        return json.substring(start, end);
    }
}
