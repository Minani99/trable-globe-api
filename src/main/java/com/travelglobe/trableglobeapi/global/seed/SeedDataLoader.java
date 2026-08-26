package com.travelglobe.trableglobeapi.global.seed;

import com.travelglobe.trableglobeapi.location.domain.City;
import com.travelglobe.trableglobeapi.location.domain.Country;
import com.travelglobe.trableglobeapi.location.repository.CityRepository;
import com.travelglobe.trableglobeapi.location.repository.CountryRepository;
import com.travelglobe.trableglobeapi.member.domain.Member;
import com.travelglobe.trableglobeapi.member.repository.MemberRepository;
import com.travelglobe.trableglobeapi.travel.domain.Travel;
import com.travelglobe.trableglobeapi.travel.domain.TravelPhoto;
import com.travelglobe.trableglobeapi.travel.domain.TravelPlace;
import com.travelglobe.trableglobeapi.travel.domain.Visibility;
import com.travelglobe.trableglobeapi.travel.repository.TravelPhotoRepository;
import com.travelglobe.trableglobeapi.travel.repository.TravelRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Inserts the demo traveller so the globe has something to render on a fresh database.
 *
 * <p>Enabled by {@code travel-globe.seed.enabled}, which is true for the {@code local} and
 * {@code postgres} profiles and false for {@code prod} - production must never invent
 * travel records. The loader is idempotent: when the demo handle already exists it only
 * refreshes the showcase profile copy, so restarting against a persistent PostgreSQL database
 * will not duplicate travel data.
 *
 * <p>Everything here is invented. Image URLs point at generated SVG placeholders shipped
 * in the frontend's {@code public/placeholders} folder, so the UI has real files to load
 * without depending on an external image host.
 */
@Component
@ConditionalOnProperty(prefix = "travel-globe.seed", name = "enabled", havingValue = "true")
public class SeedDataLoader implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(SeedDataLoader.class);

    private static final String DEMO_USERNAME = "traveler";
    private static final String DEMO_DISPLAY_NAME = "샘플 여행자";
    private static final String DEMO_BIO = "여러 나라의 계획과 기록을 미리 둘러보는 공개 샘플";
    private static final String DEMO_PROFILE_IMAGE_URL = "/placeholders/avatar.svg";

    private final MemberRepository memberRepository;
    private final CountryRepository countryRepository;
    private final CityRepository cityRepository;
    private final TravelRepository travelRepository;
    private final TravelPhotoRepository travelPhotoRepository;

    public SeedDataLoader(MemberRepository memberRepository,
                          CountryRepository countryRepository,
                          CityRepository cityRepository,
                          TravelRepository travelRepository,
                          TravelPhotoRepository travelPhotoRepository) {
        this.memberRepository = memberRepository;
        this.countryRepository = countryRepository;
        this.cityRepository = cityRepository;
        this.travelRepository = travelRepository;
        this.travelPhotoRepository = travelPhotoRepository;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        Member existingTraveler = memberRepository.findByUsername(DEMO_USERNAME).orElse(null);
        if (existingTraveler != null) {
            existingTraveler.updateProfile(DEMO_DISPLAY_NAME, DEMO_BIO, DEMO_PROFILE_IMAGE_URL);
            memberRepository.save(existingTraveler);
            log.info("Refreshed demo profile while preserving existing travel data");
            return;
        }

        Member traveler = memberRepository.save(Member.create(
                DEMO_USERNAME,
                DEMO_DISPLAY_NAME,
                DEMO_BIO,
                DEMO_PROFILE_IMAGE_URL));

        Country korea = country("KR", "KOR", "South Korea", "대한민국", "35.907757", "127.766922");
        Country japan = country("JP", "JPN", "Japan", "일본", "36.204824", "138.252924");
        Country taiwan = country("TW", "TWN", "Taiwan", "대만", "23.697810", "120.960515");
        Country usa = country("US", "USA", "United States", "미국", "39.828175", "-98.579500");
        Country france = country("FR", "FRA", "France", "프랑스", "46.227638", "2.213749");
        Country thailand = country("TH", "THA", "Thailand", "태국", "15.870032", "100.992541");

        City seoul = city(korea, "Seoul", "서울", "37.566535", "126.977969");
        City busan = city(korea, "Busan", "부산", "35.179554", "129.075642");
        City fukuoka = city(japan, "Fukuoka", "후쿠오카", "33.590355", "130.401716");
        City naha = city(japan, "Naha", "나하", "26.212401", "127.680932");
        City taipei = city(taiwan, "Taipei", "타이베이", "25.032969", "121.565418");
        City miami = city(usa, "Miami", "마이애미", "25.761681", "-80.191788");
        City keyWest = city(usa, "Key West", "키웨스트", "24.555059", "-81.779984");
        City paris = city(france, "Paris", "파리", "48.856613", "2.352222");
        City bangkok = city(thailand, "Bangkok", "방콕", "13.756331", "100.501762");

        seedTaipei(traveler, taiwan, taipei);
        seedFukuoka(traveler, japan, fukuoka);
        seedFlorida(traveler, usa, miami, keyWest);
        seedOkinawa(traveler, japan, naha);
        seedKorea(traveler, korea, seoul, busan);
        seedParis(traveler, france, paris);
        seedBangkok(traveler, thailand, bangkok);

        log.info("Seeded demo profile '{}' with {} travels", DEMO_USERNAME, travelRepository.count());
    }

    private void seedTaipei(Member owner, Country taiwan, City taipei) {
        Travel travel = Travel.create(owner,
                "Taipei, again.",
                "밤거리부터 위스키 바까지, 짧게 다녀온 세 번째 대만 여행.",
                LocalDate.of(2026, 5, 16),
                LocalDate.of(2026, 5, 18),
                "/placeholders/cover-01.svg",
                Visibility.PUBLIC);

        travel.addPlace(TravelPlace.create(taiwan, taipei, "닝샤 야시장",
                bd("25.055000"), bd("121.515000"), LocalDate.of(2026, 5, 16),
                "첫날 밤은 언제나 야시장부터.", 0));
        travel.addPlace(TravelPlace.create(taiwan, taipei, "타이베이 101",
                bd("25.033976"), bd("121.564472"), LocalDate.of(2026, 5, 17),
                "전망대보다 아래에서 올려다보는 쪽이 좋다.", 1));
        travel.addPlace(TravelPlace.create(taiwan, taipei, "디화제",
                bd("25.055600"), bd("121.510000"), LocalDate.of(2026, 5, 18),
                "오래된 상점가에서 차를 샀다.", 2));

        persist(travel, List.of(
                photo(0, "/placeholders/photo-01.svg", "야시장의 첫 저녁", LocalDate.of(2026, 5, 16)),
                photo(1, "/placeholders/photo-02.svg", "101 아래에서", LocalDate.of(2026, 5, 17)),
                photo(2, "/placeholders/photo-03.svg", "디화제의 오후", LocalDate.of(2026, 5, 18))));
    }

    private void seedFukuoka(Member owner, Country japan, City fukuoka) {
        Travel travel = Travel.create(owner,
                "후쿠오카의 사흘",
                "포장마차와 공원, 그리고 아무 계획 없는 산책.",
                LocalDate.of(2026, 3, 6),
                LocalDate.of(2026, 3, 8),
                "/placeholders/cover-02.svg",
                Visibility.PUBLIC);

        travel.addPlace(TravelPlace.create(japan, fukuoka, "나카스 야타이",
                bd("33.593000"), bd("130.403000"), LocalDate.of(2026, 3, 6),
                "강가에 늘어선 포장마차.", 0));
        travel.addPlace(TravelPlace.create(japan, fukuoka, "오호리 공원",
                bd("33.586000"), bd("130.379000"), LocalDate.of(2026, 3, 7),
                "호수를 한 바퀴 걸었다.", 1));

        persist(travel, List.of(
                photo(0, "/placeholders/photo-04.svg", "야타이의 밤", LocalDate.of(2026, 3, 6)),
                photo(1, "/placeholders/photo-05.svg", "오호리 공원 산책", LocalDate.of(2026, 3, 7))));
    }

    private void seedFlorida(Member owner, Country usa, City miami, City keyWest) {
        Travel travel = Travel.create(owner,
                "Miami & Key West",
                "북쪽 도시에서 남쪽 끝까지, 1번 국도를 따라 내려간 일주일.",
                LocalDate.of(2025, 10, 11),
                LocalDate.of(2025, 10, 18),
                "/placeholders/cover-03.svg",
                Visibility.PUBLIC);

        travel.addPlace(TravelPlace.create(usa, miami, "사우스 비치",
                bd("25.782600"), bd("-80.134100"), LocalDate.of(2025, 10, 11),
                "아침 수영으로 시작한 여행.", 0));
        travel.addPlace(TravelPlace.create(usa, miami, "리틀 하바나",
                bd("25.765700"), bd("-80.219700"), LocalDate.of(2025, 10, 13),
                "거리 전체가 음악이었다.", 1));
        travel.addPlace(TravelPlace.create(usa, keyWest, "말로리 스퀘어",
                bd("24.559600"), bd("-81.807100"), LocalDate.of(2025, 10, 16),
                "미국 최남단에서 본 일몰.", 2));

        persist(travel, List.of(
                photo(0, "/placeholders/photo-06.svg", "사우스 비치의 아침", LocalDate.of(2025, 10, 11)),
                photo(1, "/placeholders/photo-07.svg", "리틀 하바나", LocalDate.of(2025, 10, 13)),
                photo(2, "/placeholders/photo-08.svg", "말로리 스퀘어의 일몰", LocalDate.of(2025, 10, 16))));
    }

    private void seedOkinawa(Member owner, Country japan, City naha) {
        Travel travel = Travel.create(owner,
                "오키나와, 바다의 시간",
                "아무것도 하지 않기 위해 떠난 나흘.",
                LocalDate.of(2025, 6, 20),
                LocalDate.of(2025, 6, 23),
                "/placeholders/cover-04.svg",
                Visibility.PUBLIC);

        travel.addPlace(TravelPlace.create(japan, naha, "국제거리",
                bd("26.214500"), bd("127.687000"), LocalDate.of(2025, 6, 20),
                "도착하자마자 걸었다.", 0));
        travel.addPlace(TravelPlace.create(japan, naha, "슈리성",
                bd("26.217000"), bd("127.719500"), LocalDate.of(2025, 6, 22),
                "복원 중인 성벽을 오래 봤다.", 1));

        persist(travel, List.of(
                photo(0, "/placeholders/photo-09.svg", "국제거리의 저녁", LocalDate.of(2025, 6, 20)),
                photo(1, "/placeholders/photo-10.svg", "슈리성에서", LocalDate.of(2025, 6, 22))));
    }

    private void seedKorea(Member owner, Country korea, City seoul, City busan) {
        Travel travel = Travel.create(owner,
                "서울에서 부산까지",
                "기차로 내려가면서 도시 두 곳을 이어 붙인 봄 여행.",
                LocalDate.of(2025, 4, 4),
                LocalDate.of(2025, 4, 7),
                "/placeholders/cover-05.svg",
                Visibility.PUBLIC);

        travel.addPlace(TravelPlace.create(korea, seoul, "을지로",
                bd("37.566000"), bd("126.991000"), LocalDate.of(2025, 4, 4),
                "골목마다 다른 시간이 흐른다.", 0));
        travel.addPlace(TravelPlace.create(korea, busan, "감천문화마을",
                bd("35.097500"), bd("129.010700"), LocalDate.of(2025, 4, 6),
                "언덕을 오르내리며 하루를 다 썼다.", 1));
        travel.addPlace(TravelPlace.create(korea, busan, "광안리",
                bd("35.153200"), bd("129.118600"), LocalDate.of(2025, 4, 7),
                "마지막 밤은 바다 앞에서.", 2));

        persist(travel, List.of(
                photo(0, "/placeholders/photo-11.svg", "을지로의 골목", LocalDate.of(2025, 4, 4)),
                photo(1, "/placeholders/photo-12.svg", "감천문화마을", LocalDate.of(2025, 4, 6)),
                photo(2, "/placeholders/photo-13.svg", "광안리의 밤", LocalDate.of(2025, 4, 7))));
    }

    private void seedParis(Member owner, Country france, City paris) {
        Travel travel = Travel.create(owner,
                "파리의 긴 주말",
                "미술관과 센강 사이를 천천히 걸었던 사흘.",
                LocalDate.of(2024, 10, 4),
                LocalDate.of(2024, 10, 6),
                "/placeholders/cover-02.svg",
                Visibility.PUBLIC);

        travel.addPlace(TravelPlace.create(france, paris, "오르세 미술관",
                bd("48.860000"), bd("2.326600"), LocalDate.of(2024, 10, 4),
                "오후 빛이 들어오는 시계탑 아래에서.", 0));
        travel.addPlace(TravelPlace.create(france, paris, "몽마르트르",
                bd("48.886700"), bd("2.343100"), LocalDate.of(2024, 10, 5),
                "언덕 위에서 도시의 저녁을 기다렸다.", 1));

        persist(travel, List.of());
    }

    private void seedBangkok(Member owner, Country thailand, City bangkok) {
        Travel travel = Travel.create(owner,
                "방콕, 골목과 강 사이",
                "시장과 사원, 강변을 오가며 보낸 나흘.",
                LocalDate.of(2024, 2, 8),
                LocalDate.of(2024, 2, 11),
                "/placeholders/cover-04.svg",
                Visibility.PUBLIC);

        travel.addPlace(TravelPlace.create(thailand, bangkok, "왓 아룬",
                bd("13.743700"), bd("100.488900"), LocalDate.of(2024, 2, 9),
                "강 건너에서 해가 기울 때까지 바라봤다.", 0));
        travel.addPlace(TravelPlace.create(thailand, bangkok, "짜뚜짝 시장",
                bd("13.799900"), bd("100.550100"), LocalDate.of(2024, 2, 10),
                "길을 잃는 것까지 일정이 된 오후.", 1));

        persist(travel, List.of());
    }

    /**
     * Saves a trip with its itinerary, then attaches photos to the now-persisted stops.
     *
     * @param photoSpecs photos to attach, each pointing at a stop by its itinerary index
     */
    private void persist(Travel travel, List<PhotoSpec> photoSpecs) {
        Travel saved = travelRepository.save(travel);
        List<TravelPlace> places = saved.getPlaces();

        List<TravelPhoto> photos = new ArrayList<>();
        for (int i = 0; i < photoSpecs.size(); i++) {
            PhotoSpec spec = photoSpecs.get(i);
            TravelPlace place = spec.placeIndex() < places.size() ? places.get(spec.placeIndex()) : null;
            photos.add(TravelPhoto.create(saved, place, spec.imageUrl(), spec.caption(), spec.takenAt(), i));
        }
        travelPhotoRepository.saveAll(photos);
    }

    private Country country(String iso2, String iso3, String nameEn, String nameKo, String lat, String lng) {
        return countryRepository.save(Country.create(iso2, iso3, nameEn, nameKo, bd(lat), bd(lng)));
    }

    private City city(Country country, String nameEn, String nameKo, String lat, String lng) {
        return cityRepository.save(City.create(country, nameEn, nameKo, bd(lat), bd(lng)));
    }

    private static PhotoSpec photo(int placeIndex, String imageUrl, String caption, LocalDate takenAt) {
        return new PhotoSpec(placeIndex, imageUrl, caption, takenAt);
    }

    private static BigDecimal bd(String value) {
        return new BigDecimal(value);
    }

    private record PhotoSpec(int placeIndex, String imageUrl, String caption, LocalDate takenAt) {
    }
}
