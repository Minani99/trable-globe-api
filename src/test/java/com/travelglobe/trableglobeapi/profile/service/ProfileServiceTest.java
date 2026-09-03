package com.travelglobe.trableglobeapi.profile.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.travelglobe.trableglobeapi.global.exception.ResourceNotFoundException;
import com.travelglobe.trableglobeapi.global.seed.SeedDataLoader;
import com.travelglobe.trableglobeapi.member.domain.Member;
import com.travelglobe.trableglobeapi.member.repository.MemberRepository;
import com.travelglobe.trableglobeapi.profile.dto.ProfileResponse;
import com.travelglobe.trableglobeapi.profile.dto.VisitedCountryResponse;
import com.travelglobe.trableglobeapi.statistics.dto.TravelStatisticsResponse;
import com.travelglobe.trableglobeapi.travel.dto.TravelSummaryResponse;
import java.util.List;
import java.util.Map;
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

    @Autowired
    private SeedDataLoader seedDataLoader;

    @Autowired
    private MemberRepository memberRepository;

    @Test
    @DisplayName("프로필은 기본 정보와 통계를 함께 반환한다")
    void returnsProfileWithStatistics() {
        ProfileResponse profile = profileService.getProfile(DEMO_USERNAME);

        assertThat(profile.username()).isEqualTo(DEMO_USERNAME);
        assertThat(profile.displayName()).isEqualTo("샘플 여행자");
        assertThat(profile.statistics().countryCount()).isEqualTo(66);
        assertThat(profile.statistics().cityCount()).isEqualTo(88);
        assertThat(profile.statistics().travelCount()).isEqualTo(45);
    }

    @Test
    @DisplayName("기존 데모 여행은 보존하면서 빠진 샘플만 보강한다")
    void refreshesExistingDemoProfileWithoutDuplicatingTravels() {
        Member traveler = memberRepository.findByUsername(DEMO_USERNAME).orElseThrow();
        traveler.updateProfile("Old demo name", "Old demo bio", null);
        memberRepository.saveAndFlush(traveler);
        int travelCountBeforeRefresh = profileService.getTravels(DEMO_USERNAME).size();

        seedDataLoader.run(null);

        ProfileResponse refreshedProfile = profileService.getProfile(DEMO_USERNAME);
        assertThat(refreshedProfile.displayName()).isEqualTo("샘플 여행자");
        assertThat(refreshedProfile.bio()).isEqualTo("여러 나라의 계획과 기록을 미리 둘러보는 공개 샘플");
        assertThat(profileService.getTravels(DEMO_USERNAME)).hasSize(travelCountBeforeRefresh);
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

        assertThat(countries).hasSize(66);
        assertThat(countries).extracting(VisitedCountryResponse::iso2Code)
                .contains("KR", "JP", "TW", "US", "FR", "TH")
                .contains("GB", "IS", "MA", "CH", "TR", "SG", "NP", "NZ")
                .contains("CA", "MX", "PE", "BR", "CU", "EG", "KE", "ZA");
        assertThat(countries).allSatisfy(country -> {
            assertThat(country.latitude()).isNotNull();
            assertThat(country.longitude()).isNotNull();
            assertThat(country.travelCount()).isPositive();
        });

        VisitedCountryResponse japan = countries.stream()
                .filter(c -> c.iso2Code().equals("JP")).findFirst().orElseThrow();
        assertThat(japan.travelCount()).isEqualTo(5);
        assertThat(japan.cityCount()).isEqualTo(6);
    }

    @Test
    @DisplayName("샘플의 재방문 횟수는 날짜가 다른 실제 여행 기록과 일치한다")
    void repeatVisitsHaveDistinctJourneysAndConsistentCounts() {
        Map<String, Integer> expectedVisits = Map.ofEntries(
                Map.entry("JP", 5), Map.entry("US", 4), Map.entry("FR", 3),
                Map.entry("TH", 3), Map.entry("TW", 3), Map.entry("IT", 2),
                Map.entry("GB", 2), Map.entry("ES", 2), Map.entry("VN", 2),
                Map.entry("SG", 2), Map.entry("AU", 2));
        List<VisitedCountryResponse> countries = profileService.getVisitedCountries(DEMO_USERNAME);
        expectedVisits.forEach((code, count) -> {
            List<TravelSummaryResponse> travels = profileService.getTravelsByCountry(DEMO_USERNAME, code);
            assertThat(travels).hasSize(count);
            assertThat(travels).extracting(TravelSummaryResponse::startDate).doesNotHaveDuplicates();
            assertThat(travels).extracting(TravelSummaryResponse::title).doesNotHaveDuplicates();
            VisitedCountryResponse country = countries.stream()
                    .filter(candidate -> candidate.iso2Code().equals(code)).findFirst().orElseThrow();
            assertThat(country.travelCount()).isEqualTo(count.longValue());
            assertThat(travels).allSatisfy(travel -> assertThat(travel.routePoints()).hasSizeGreaterThanOrEqualTo(2));
        });
        assertThat(countries).anySatisfy(country -> assertThat(country.travelCount()).isEqualTo(1));
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

        assertThat(travels).hasSize(45);
        assertThat(travels.get(0).title()).isEqualTo("Taipei, again.");
        assertThat(travels.get(0).primaryCountry().iso2Code()).isEqualTo("TW");
        assertThat(travels.get(0).primaryCity().nameEn()).isEqualTo("Taipei");
        assertThat(travels.get(0).routePoints()).hasSize(3);
        assertThat(travels.get(0).routePoints()).allSatisfy(point -> {
            assertThat(point.latitude()).isNotNull();
            assertThat(point.longitude()).isNotNull();
            assertThat(point.label()).isNotBlank();
            assertThat(point.countryCode()).isEqualTo("TW");
        });
        assertThat(travels).extracting(TravelSummaryResponse::startDate).isSortedAccordingTo(
                java.util.Comparator.reverseOrder());
    }

    @Test
    @DisplayName("국가별 여행 조회는 해당 국가를 거친 여행만 반환한다")
    void filtersTravelsByCountry() {
        List<TravelSummaryResponse> japanTravels = profileService.getTravelsByCountry(DEMO_USERNAME, "jp");

        assertThat(japanTravels).hasSize(5);
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

        assertThat(statistics.placeCount()).isEqualTo(113);
        assertThat(statistics.firstTravelDate()).isNotNull();
        assertThat(statistics.latestTravelDate()).isNotNull();
    }
}
