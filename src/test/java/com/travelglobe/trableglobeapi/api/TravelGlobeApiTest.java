package com.travelglobe.trableglobeapi.api;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.http.MediaType;

/**
 * End-to-end HTTP checks over the seeded database: routing, the response envelope and
 * the error contract the frontend depends on.
 */
@SpringBootTest
@AutoConfigureMockMvc
class TravelGlobeApiTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("GET /api/health 는 UP 을 반환한다")
    void healthReportsUp() throws Exception {
        mockMvc.perform(get("/api/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("UP"));
    }

    @Test
    @DisplayName("GET /api/profiles/{username} 은 프로필과 통계를 반환한다")
    void returnsProfile() throws Exception {
        mockMvc.perform(get("/api/profiles/traveler"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.username").value("traveler"))
                .andExpect(jsonPath("$.data.statistics.countryCount").value(4))
                .andExpect(jsonPath("$.data.statistics.cityCount").value(7))
                .andExpect(jsonPath("$.data.statistics.travelCount").value(5));
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
        mockMvc.perform(get("/api/profiles/traveler/countries"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(4))
                .andExpect(jsonPath("$.data[0].iso2Code").isNotEmpty())
                .andExpect(jsonPath("$.data[0].latitude").isNumber())
                .andExpect(jsonPath("$.data[0].longitude").isNumber())
                .andExpect(jsonPath("$.data[0].travelCount").isNumber());
    }

    @Test
    @DisplayName("GET /api/profiles/{username}/travels 는 최신 여행부터 반환한다")
    void returnsTravels() throws Exception {
        mockMvc.perform(get("/api/profiles/traveler/travels"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(5))
                .andExpect(jsonPath("$.data[0].title").value("Taipei, again."))
                .andExpect(jsonPath("$.data[0].primaryCountry.nameKo").value("대만"))
                .andExpect(jsonPath("$.data[0].durationDays").value(3));
    }

    @Test
    @DisplayName("GET /api/profiles/{username}/countries/{code}/travels 는 국가별 여행을 반환한다")
    void returnsTravelsByCountry() throws Exception {
        mockMvc.perform(get("/api/profiles/traveler/countries/JP/travels"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(2));
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
        String body = mockMvc.perform(get("/api/profiles/traveler/travels"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        // The newest trip is first; its id is what the profile page would link to.
        int idIndex = body.indexOf("\"id\":");
        long travelId = Long.parseLong(body.substring(idIndex + 5, body.indexOf(',', idIndex)).trim());

        mockMvc.perform(get("/api/travels/" + travelId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.title").value("Taipei, again."))
                .andExpect(jsonPath("$.data.owner.username").value("traveler"))
                .andExpect(jsonPath("$.data.places.length()").value(3))
                .andExpect(jsonPath("$.data.places[0].latitude").isNumber())
                .andExpect(jsonPath("$.data.photos.length()").value(3))
                // Newest trip: nothing newer, but an older one exists.
                .andExpect(jsonPath("$.data.nextTravel").doesNotExist())
                .andExpect(jsonPath("$.data.previousTravel.title").value("후쿠오카의 사흘"));
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
    @DisplayName("인증 토큰이 없으면 개인 쓰기 API를 사용할 수 없다")
    void privateWritesRequireAuthentication() throws Exception {
        mockMvc.perform(post("/api/private/travels")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("AUTHENTICATION_REQUIRED"));
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
