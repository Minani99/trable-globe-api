package com.travelglobe.trableglobeapi.api;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

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
}
