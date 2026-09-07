package com.travelglobe.trableglobeapi.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

/**
 * Who is allowed to touch a travel record.
 *
 * <p>Ownership is enforced by scoping every query to the caller
 * ({@code findOwnedDetail(travelId, memberId)}) rather than loading a row and checking
 * it afterwards. That is the right shape, and it is also the kind of thing a later
 * refactor can quietly widen - swapping in a plain {@code findById} still compiles,
 * still passes every other test, and hands one member's itinerary to anyone who guesses
 * an id. These tests fail loudly if that happens.
 *
 * <p>A stranger gets 404 rather than 403 throughout: telling them "this exists but is
 * not yours" is itself a disclosure, and the tests pin that choice.
 */
@SpringBootTest
@AutoConfigureMockMvc
class TravelAuthorizationTest {

    private static final AtomicInteger SEQUENCE = new AtomicInteger();
    private static final String PASSWORD = "a-long-enough-password";

    @Autowired
    private MockMvc mockMvc;

    // --- another signed-in member ------------------------------------------

    @Test
    @DisplayName("남의 여행은 상세 조회도 되지 않는다")
    void aStrangerCannotReadSomeoneElsesTravel() throws Exception {
        Member owner = signUp();
        long travelId = createTravel(owner.token(), "오너의 여행", "PRIVATE");
        Member stranger = signUp();

        mockMvc.perform(get("/api/private/travels/" + travelId).header("Authorization", bearer(stranger)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code").value("RESOURCE_NOT_FOUND"));
    }

    @Test
    @DisplayName("남의 여행을 수정할 수 없고, 원본도 그대로 남는다")
    void aStrangerCannotEditSomeoneElsesTravel() throws Exception {
        Member owner = signUp();
        long travelId = createTravel(owner.token(), "원래 제목", "PUBLIC");
        Member stranger = signUp();

        mockMvc.perform(put("/api/private/travels/" + travelId)
                        .header("Authorization", bearer(stranger))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(travelPayload("탈취된 제목", "PUBLIC")))
                .andExpect(status().isNotFound());

        // Rejecting the request is only half of it - nothing may have been applied on
        // the way to the refusal.
        String detail = okBody(get("/api/private/travels/" + travelId).header("Authorization", bearer(owner)));
        assertThat(JsonPath.<String>read(detail, "$.data.title")).isEqualTo("원래 제목");
    }

    @Test
    @DisplayName("소유자는 현장 완료·메모·사진을 바로 저장하고 다른 사용자는 막힌다")
    void inTripQuickActionsStayOwnerOnly() throws Exception {
        Member owner = signUp();
        long travelId = createTravel(owner.token(), "현장 기록 여행", "PRIVATE");
        String detail = okBody(get("/api/private/travels/" + travelId)
                .header("Authorization", bearer(owner)));
        long placeId = ((Number) JsonPath.read(detail, "$.data.places[0].id")).longValue();

        mockMvc.perform(patch("/api/private/travels/" + travelId + "/places/" + placeId)
                        .header("Authorization", bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"memo\":\"현장에서 바로 남긴 메모\",\"completed\":true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.places[0].memo").value("현장에서 바로 남긴 메모"))
                .andExpect(jsonPath("$.data.places[0].completedAt").isNotEmpty());

        mockMvc.perform(post("/api/private/travels/" + travelId + "/photos")
                        .header("Authorization", bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"imageUrl":"https://images.example.com/memory.jpg",
                                 "caption":null,"takenAt":"2026-08-01","travelPlaceId":%d}
                                """.formatted(placeId)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.photos[0].travelPlaceId").value(placeId));

        Member stranger = signUp();
        mockMvc.perform(patch("/api/private/travels/" + travelId + "/places/" + placeId)
                        .header("Authorization", bearer(stranger))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"memo\":\"침입\",\"completed\":false}"))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("남의 여행을 삭제할 수 없고, 원본도 살아남는다")
    void aStrangerCannotDeleteSomeoneElsesTravel() throws Exception {
        Member owner = signUp();
        long travelId = createTravel(owner.token(), "지켜야 할 여행", "PUBLIC");
        Member stranger = signUp();

        mockMvc.perform(delete("/api/private/travels/" + travelId).header("Authorization", bearer(stranger)))
                .andExpect(status().isNotFound());

        mockMvc.perform(get("/api/private/travels/" + travelId).header("Authorization", bearer(owner)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.title").value("지켜야 할 여행"));
    }

    @Test
    @DisplayName("남의 여행에 할 일·예산을 붙일 수 없다")
    void aStrangerCannotAttachPlanningDataToSomeoneElsesTravel() throws Exception {
        Member owner = signUp();
        long travelId = createTravel(owner.token(), "계획 있는 여행", "PUBLIC");
        Member stranger = signUp();

        mockMvc.perform(post("/api/private/travels/" + travelId + "/tasks")
                        .header("Authorization", bearer(stranger))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"침입자의 할 일\",\"category\":\"RESERVATION\"}"))
                .andExpect(status().isNotFound());

        // The body has to be valid: validation runs before the ownership check, so an
        // incomplete payload would return 400 and prove nothing about authorization.
        mockMvc.perform(patch("/api/private/travels/" + travelId + "/planning/budget")
                        .header("Authorization", bearer(stranger))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"targetAmount\":9999999,\"currency\":\"KRW\"}"))
                .andExpect(status().isNotFound());

        mockMvc.perform(get("/api/private/travels/" + travelId + "/planning")
                        .header("Authorization", bearer(stranger)))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("자기 목록에는 남의 여행이 섞이지 않는다")
    void theOwnedListNeverLeaksAnotherMembersTravels() throws Exception {
        Member owner = signUp();
        createTravel(owner.token(), "오너만의 여행", "PUBLIC");
        Member stranger = signUp();

        String mine = okBody(get("/api/private/travels").header("Authorization", bearer(stranger)));

        assertThat(JsonPath.<List<String>>read(mine, "$.data[*].title"))
                .doesNotContain("오너만의 여행");
    }

    // --- no session at all -------------------------------------------------

    @Test
    @DisplayName("토큰 없이는 여행을 만들거나 고치거나 지울 수 없다")
    void writesRequireASession() throws Exception {
        Member owner = signUp();
        long travelId = createTravel(owner.token(), "보호된 여행", "PUBLIC");

        mockMvc.perform(post("/api/private/travels")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(travelPayload("익명의 여행", "PUBLIC")))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(put("/api/private/travels/" + travelId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(travelPayload("익명의 수정", "PUBLIC")))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(delete("/api/private/travels/" + travelId))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/private/travels/" + travelId))
                .andExpect(status().isUnauthorized());
    }

    // --- private visibility ------------------------------------------------

    @Test
    @DisplayName("비공개 여행은 공개 프로필 어디에도 나오지 않는다")
    void privateTravelsStayOutOfThePublicProfile() throws Exception {
        Member owner = signUp();
        createTravel(owner.token(), "공개해도 되는 여행", "PUBLIC");
        long privateId = createTravel(owner.token(), "남에게 안 보일 여행", "PRIVATE");

        String publicTravels = okBody(get("/api/profiles/" + owner.username() + "/travels"));
        assertThat(JsonPath.<List<String>>read(publicTravels, "$.data[*].title"))
                .contains("공개해도 되는 여행")
                .doesNotContain("남에게 안 보일 여행");

        // Nor by addressing it directly, and nor as a 403 that would confirm it exists.
        mockMvc.perform(get("/api/travels/" + privateId))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code").value("RESOURCE_NOT_FOUND"));
    }

    @Test
    @DisplayName("비공개 여행은 공개 통계에도 포함되지 않는다")
    void privateTravelsDoNotInflatePublicStatistics() throws Exception {
        Member owner = signUp();
        createTravel(owner.token(), "공개 여행", "PUBLIC");

        int before = JsonPath.read(okBody(get("/api/profiles/" + owner.username())),
                "$.data.statistics.travelCount");
        createTravel(owner.token(), "비공개 여행", "PRIVATE");
        int after = JsonPath.read(okBody(get("/api/profiles/" + owner.username())),
                "$.data.statistics.travelCount");

        assertThat(after).isEqualTo(before);
    }

    @Test
    @DisplayName("본인은 자기 비공개 여행을 볼 수 있다")
    void theOwnerCanStillSeeTheirOwnPrivateTravel() throws Exception {
        Member owner = signUp();
        long privateId = createTravel(owner.token(), "나만 보는 여행", "PRIVATE");

        // The counterpart to the tests above: hiding it from everyone would be a
        // different bug, and one those tests would happily pass.
        mockMvc.perform(get("/api/private/travels/" + privateId).header("Authorization", bearer(owner)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.title").value("나만 보는 여행"))
                .andExpect(jsonPath("$.data.visibility").value("PRIVATE"));
    }

    // --- helpers -----------------------------------------------------------

    private record Member(String username, String token) {
    }

    private static String bearer(Member member) {
        return "Bearer " + member.token();
    }

    /** Registers a fresh member so no test depends on another's data. */
    private Member signUp() throws Exception {
        String username = "owner" + SEQUENCE.incrementAndGet() + "x";
        String body = """
                {"username":"%s","displayName":"테스터","email":"%s@example.com","password":"%s"}
                """.formatted(username, username, PASSWORD);
        String response = okBody(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body));
        return new Member(username, JsonPath.read(response, "$.data.token"));
    }

    private long createTravel(String token, String title, String visibility) throws Exception {
        String response = mockMvc.perform(post("/api/private/travels")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(travelPayload(title, visibility)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return ((Number) JsonPath.read(response, "$.data.id")).longValue();
    }

    private String okBody(MockHttpServletRequestBuilder request) throws Exception {
        return mockMvc.perform(request)
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
    }

    private static String travelPayload(String title, String visibility) {
        return """
                {
                  "title": "%s",
                  "description": "권한 테스트용 기록",
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
                    "memo": null
                  }],
                  "photos": []
                }
                """.formatted(title, visibility);
    }
}
