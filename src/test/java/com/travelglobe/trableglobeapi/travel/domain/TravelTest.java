package com.travelglobe.trableglobeapi.travel.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.travelglobe.trableglobeapi.location.domain.City;
import com.travelglobe.trableglobeapi.location.domain.Country;
import com.travelglobe.trableglobeapi.member.domain.Member;
import java.math.BigDecimal;
import java.time.LocalDate;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class TravelTest {

    private static final Member OWNER = Member.create("traveler", "Travel Globe", null, null);

    @Test
    @DisplayName("여행 기간은 시작일과 종료일을 모두 포함해 계산한다")
    void durationCountsBothEndDays() {
        Travel travel = Travel.create(OWNER, "Taipei", null,
                LocalDate.of(2026, 5, 16), LocalDate.of(2026, 5, 18), null, Visibility.PUBLIC);

        assertThat(travel.getDurationDays()).isEqualTo(3);
    }

    @Test
    @DisplayName("당일치기 여행의 기간은 1일이다")
    void singleDayTripLastsOneDay() {
        LocalDate day = LocalDate.of(2026, 5, 16);
        Travel travel = Travel.create(OWNER, "Day trip", null, day, day, null, Visibility.PUBLIC);

        assertThat(travel.getDurationDays()).isEqualTo(1);
    }

    @Test
    @DisplayName("종료일이 시작일보다 빠르면 생성할 수 없다")
    void rejectsReversedDateRange() {
        assertThatThrownBy(() -> Travel.create(OWNER, "Broken", null,
                LocalDate.of(2026, 5, 18), LocalDate.of(2026, 5, 16), null, Visibility.PUBLIC))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("장소를 추가하면 양방향 연관관계가 함께 설정된다")
    void addingPlaceLinksBothSides() {
        Travel travel = Travel.create(OWNER, "Taipei", null,
                LocalDate.of(2026, 5, 16), LocalDate.of(2026, 5, 18), null, Visibility.PUBLIC);
        TravelPlace place = TravelPlace.create(
                com.travelglobe.trableglobeapi.location.domain.Country.create(
                        "TW", "TWN", "Taiwan", "대만",
                        new java.math.BigDecimal("23.697810"), new java.math.BigDecimal("120.960515")),
                null, "타이베이 101", null, null, LocalDate.of(2026, 5, 17), null, 0);

        travel.addPlace(place);

        assertThat(travel.getPlaces()).containsExactly(place);
        assertThat(place.getTravel()).isSameAs(travel);
    }

    @Test
    @DisplayName("좌표가 없는 장소는 국가 중심 좌표로 대체된다")
    void placeFallsBackToCountryCentroid() {
        var taiwan = com.travelglobe.trableglobeapi.location.domain.Country.create(
                "TW", "TWN", "Taiwan", "대만",
                new java.math.BigDecimal("23.697810"), new java.math.BigDecimal("120.960515"));
        TravelPlace place = TravelPlace.create(taiwan, null, "미상", null, null, null, null, 0);

        assertThat(place.resolveLatitude()).isEqualByComparingTo("23.697810");
        assertThat(place.resolveLongitude()).isEqualByComparingTo("120.960515");
    }

    @Test
    @DisplayName("방문 도시와 국가가 다르면 장소를 생성할 수 없다")
    void rejectsCityFromAnotherCountry() {
        Country korea = country("KR", "KOR", "South Korea", "대한민국", "35.907757", "127.766922");
        Country japan = country("JP", "JPN", "Japan", "일본", "36.204824", "138.252924");
        City seoul = City.create(korea, "Seoul", "서울", bd("37.566535"), bd("126.977969"));

        assertThatThrownBy(() -> TravelPlace.create(
                japan, seoul, "잘못된 장소", null, null, null, null, 0))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("도시와 국가");
    }

    @Test
    @DisplayName("사진은 같은 여행의 방문 장소에만 연결할 수 있다")
    void rejectsPhotoLinkedToAnotherTravel() {
        Travel first = Travel.create(OWNER, "First", null,
                LocalDate.of(2026, 1, 1), LocalDate.of(2026, 1, 2), null, Visibility.PUBLIC);
        Travel second = Travel.create(OWNER, "Second", null,
                LocalDate.of(2026, 2, 1), LocalDate.of(2026, 2, 2), null, Visibility.PUBLIC);
        TravelPlace firstPlace = TravelPlace.create(
                country("TW", "TWN", "Taiwan", "대만", "23.697810", "120.960515"),
                null, "Taipei", null, null, null, null, 0);
        first.addPlace(firstPlace);

        assertThatThrownBy(() -> TravelPhoto.create(
                second, firstPlace, "/photo.jpg", null, null, 0))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("같은 여행");
    }

    private static Country country(String iso2, String iso3, String nameEn, String nameKo,
                                   String latitude, String longitude) {
        return Country.create(iso2, iso3, nameEn, nameKo, bd(latitude), bd(longitude));
    }

    private static BigDecimal bd(String value) {
        return new BigDecimal(value);
    }
}
