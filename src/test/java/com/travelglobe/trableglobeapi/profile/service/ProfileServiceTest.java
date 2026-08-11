package com.travelglobe.trableglobeapi.profile.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.travelglobe.trableglobeapi.global.exception.ResourceNotFoundException;
import com.travelglobe.trableglobeapi.profile.dto.ProfileResponse;
import com.travelglobe.trableglobeapi.profile.dto.VisitedCountryResponse;
import com.travelglobe.trableglobeapi.statistics.dto.TravelStatisticsResponse;
import com.travelglobe.trableglobeapi.travel.dto.TravelSummaryResponse;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

/**
 * Exercises the profile read model against the seeded in-memory database.
 *
 * <p>Runs on the default {@code local} profile, so no PostgreSQL instance is required.
 */
@SpringBootTest
class ProfileServiceTest {

    private static final String DEMO_USERNAME = "traveler";

    @Autowired
    private ProfileService profileService;

    @Test
    @DisplayName("프로필은 기본 정보와 통계를 함께 반환한다")
    void returnsProfileWithStatistics() {
        ProfileResponse profile = profileService.getProfile(DEMO_USERNAME);

        assertThat(profile.username()).isEqualTo(DEMO_USERNAME);
        assertThat(profile.displayName()).isEqualTo("Travel Globe");
        assertThat(profile.statistics().countryCount()).isEqualTo(4);
        assertThat(profile.statistics().cityCount()).isEqualTo(7);
        assertThat(profile.statistics().travelCount()).isEqualTo(5);
    }

    @Test
    @DisplayName("대소문자가 달라도 같은 프로필로 해석된다")
    void usernameLookupIsCaseInsensitive() {
        assertThat(profileService.getProfile("TRAVELER").username()).isEqualTo(DEMO_USERNAME);
    }

    @Test
    @DisplayName("존재하지 않는 사용자는 404로 처리한다")
    void unknownUsernameIsNotFound() {
        assertThatThrownBy(() -> profileService.getProfile("nobody"))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("방문 국가는 여행 횟수가 많은 순으로 좌표와 함께 반환된다")
    void returnsVisitedCountriesForTheGlobe() {
        List<VisitedCountryResponse> countries = profileService.getVisitedCountries(DEMO_USERNAME);

        assertThat(countries).hasSize(4);
        assertThat(countries).extracting(VisitedCountryResponse::iso2Code)
                .containsExactlyInAnyOrder("KR", "JP", "TW", "US");
        assertThat(countries).allSatisfy(country -> {
            assertThat(country.latitude()).isNotNull();
            assertThat(country.longitude()).isNotNull();
            assertThat(country.travelCount()).isPositive();
        });

        VisitedCountryResponse japan = countries.stream()
                .filter(c -> c.iso2Code().equals("JP")).findFirst().orElseThrow();
        assertThat(japan.travelCount()).isEqualTo(2);
        assertThat(japan.cityCount()).isEqualTo(2);
    }

    @Test
    @DisplayName("방문 국가 목록은 여행이 많은 국가부터 정렬된다")
    void visitedCountriesAreSortedByTravelCount() {
        List<Long> travelCounts = profileService.getVisitedCountries(DEMO_USERNAME).stream()
                .map(VisitedCountryResponse::travelCount)
                .toList();

        assertThat(travelCounts).isSortedAccordingTo(java.util.Comparator.reverseOrder());
    }

    @Test
    @DisplayName("여행 목록은 최신순으로 대표 국가/도시와 함께 반환된다")
    void returnsTravelsNewestFirst() {
        List<TravelSummaryResponse> travels = profileService.getTravels(DEMO_USERNAME);

        assertThat(travels).hasSize(5);
        assertThat(travels.get(0).title()).isEqualTo("Taipei, again.");
        assertThat(travels.get(0).primaryCountry().iso2Code()).isEqualTo("TW");
        assertThat(travels.get(0).primaryCity().nameEn()).isEqualTo("Taipei");
        assertThat(travels).extracting(TravelSummaryResponse::startDate).isSortedAccordingTo(
                java.util.Comparator.reverseOrder());
    }

    @Test
    @DisplayName("국가별 여행 조회는 해당 국가를 거친 여행만 반환한다")
    void filtersTravelsByCountry() {
        List<TravelSummaryResponse> japanTravels = profileService.getTravelsByCountry(DEMO_USERNAME, "jp");

        assertThat(japanTravels).hasSize(2);
        assertThat(japanTravels).allSatisfy(travel ->
                assertThat(travel.countries()).extracting("iso2Code").contains("JP"));
    }

    @Test
    @DisplayName("여러 국가를 거친 여행은 모든 국가 정보를 유지한다")
    void multiCountryTravelKeepsEveryCountry() {
        TravelSummaryResponse florida = profileService.getTravels(DEMO_USERNAME).stream()
                .filter(t -> t.title().equals("Miami & Key West")).findFirst().orElseThrow();

        assertThat(florida.placeCount()).isEqualTo(3);
        assertThat(florida.countries()).extracting("iso2Code").containsExactly("US");
    }

    @Test
    @DisplayName("알 수 없는 국가 코드는 404로 처리한다")
    void unknownCountryCodeIsNotFound() {
        assertThatThrownBy(() -> profileService.getTravelsByCountry(DEMO_USERNAME, "ZZ"))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("통계 단독 조회도 같은 값을 반환한다")
    void statisticsEndpointMatchesProfile() {
        TravelStatisticsResponse statistics = profileService.getStatistics(DEMO_USERNAME);

        assertThat(statistics.placeCount()).isEqualTo(13);
        assertThat(statistics.firstTravelDate()).isNotNull();
        assertThat(statistics.latestTravelDate()).isNotNull();
    }
}
