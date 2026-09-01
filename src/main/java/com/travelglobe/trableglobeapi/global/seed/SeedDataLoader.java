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
import java.util.HashSet;
import java.util.List;
import java.util.Set;
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
 * <p>Enabled by {@code travel-globe.seed.enabled}, which is true for the {@code local},
 * {@code postgres}, and public-showcase {@code demo} profiles and false for plain {@code prod}.
 * The loader is idempotent: it refreshes the showcase profile copy and inserts only journeys
 * whose stable titles are missing, so restarting against a persistent PostgreSQL database will
 * not duplicate travel data.
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

    /**
     * A broad, invented travel history for the public sample account.
     *
     * <p>Each journey crosses three countries so the sample globe feels genuinely lived in
     * instead of looking like a product tour with a handful of pins. Titles are stable IDs for
     * the idempotent reconciliation performed on every demo-profile startup.
     */
    private static final List<ShowcaseJourney> GLOBAL_SHOWCASE = List.of(
            journey("북대서양의 세 도시", "런던에서 더블린을 거쳐 아이슬란드의 빛까지 이어진 여정.", "2024-08-02",
                    destination("GB", "GBR", "United Kingdom", "영국", "London", "런던", "51.5074", "-0.1278", "타워 브리지"),
                    destination("IE", "IRL", "Ireland", "아일랜드", "Dublin", "더블린", "53.3498", "-6.2603", "트리니티 칼리지"),
                    destination("IS", "ISL", "Iceland", "아이슬란드", "Reykjavik", "레이캬비크", "64.1466", "-21.9426", "할그림스키르캬")),
            journey("이베리아에서 마라케시까지", "대서양의 골목과 사막빛 시장을 따라 남쪽으로 내려갔다.", "2024-04-12",
                    destination("PT", "PRT", "Portugal", "포르투갈", "Lisbon", "리스본", "38.7223", "-9.1393", "벨렝 탑"),
                    destination("ES", "ESP", "Spain", "스페인", "Barcelona", "바르셀로나", "41.3874", "2.1686", "사그라다 파밀리아"),
                    destination("MA", "MAR", "Morocco", "모로코", "Marrakesh", "마라케시", "31.6295", "-7.9811", "제마 엘프나 광장")),
            journey("알프스를 넘는 기차", "로마의 오래된 돌길에서 알프스의 맑은 호수까지.", "2023-10-06",
                    destination("IT", "ITA", "Italy", "이탈리아", "Rome", "로마", "41.9028", "12.4964", "콜로세움"),
                    destination("CH", "CHE", "Switzerland", "스위스", "Zurich", "취리히", "47.3769", "8.5417", "취리히 호수"),
                    destination("AT", "AUT", "Austria", "오스트리아", "Vienna", "빈", "48.2082", "16.3738", "쇤브룬 궁전")),
            journey("중부 유럽의 겨울", "차가운 공기 속 박물관과 광장을 천천히 이어 걸었다.", "2023-02-10",
                    destination("DE", "DEU", "Germany", "독일", "Berlin", "베를린", "52.5200", "13.4050", "브란덴부르크 문"),
                    destination("CZ", "CZE", "Czechia", "체코", "Prague", "프라하", "50.0755", "14.4378", "카를교"),
                    destination("PL", "POL", "Poland", "폴란드", "Warsaw", "바르샤바", "52.2297", "21.0122", "바르샤바 구시가지")),
            journey("운하와 디자인", "자전거와 운하, 오래된 광장을 따라 북쪽 도시들을 만났다.", "2022-09-09",
                    destination("NL", "NLD", "Netherlands", "네덜란드", "Amsterdam", "암스테르담", "52.3676", "4.9041", "요르단 지구"),
                    destination("BE", "BEL", "Belgium", "벨기에", "Brussels", "브뤼셀", "50.8503", "4.3517", "그랑플라스"),
                    destination("DK", "DNK", "Denmark", "덴마크", "Copenhagen", "코펜하겐", "55.6761", "12.5683", "뉘하운")),
            journey("북유럽의 백야", "밤이 짧은 계절, 피오르와 섬 사이를 길게 이동했다.", "2022-06-03",
                    destination("NO", "NOR", "Norway", "노르웨이", "Oslo", "오슬로", "59.9139", "10.7522", "오슬로 오페라하우스"),
                    destination("SE", "SWE", "Sweden", "스웨덴", "Stockholm", "스톡홀름", "59.3293", "18.0686", "감라스탄"),
                    destination("FI", "FIN", "Finland", "핀란드", "Helsinki", "헬싱키", "60.1699", "24.9384", "헬싱키 대성당")),
            journey("아드리아해에서 이스탄불까지", "푸른 해안과 흰 골목을 지나 두 대륙이 만나는 도시로.", "2021-10-08",
                    destination("HR", "HRV", "Croatia", "크로아티아", "Dubrovnik", "두브로브니크", "42.6507", "18.0944", "두브로브니크 성벽"),
                    destination("GR", "GRC", "Greece", "그리스", "Athens", "아테네", "37.9838", "23.7275", "아크로폴리스"),
                    destination("TR", "TUR", "Turkiye", "튀르키예", "Istanbul", "이스탄불", "41.0082", "28.9784", "아야 소피아")),
            journey("베이징에서 초원까지", "거대한 성벽과 빽빽한 항구, 끝이 보이지 않는 초원을 한 번에.", "2021-05-14",
                    destination("CN", "CHN", "China", "중국", "Beijing", "베이징", "39.9042", "116.4074", "자금성"),
                    destination("HK", "HKG", "Hong Kong", "홍콩", "Hong Kong", "홍콩", "22.3193", "114.1694", "빅토리아 피크"),
                    destination("MN", "MNG", "Mongolia", "몽골", "Ulaanbaatar", "울란바토르", "47.8864", "106.9057", "수흐바타르 광장")),
            journey("동남아 도시 산책", "호수의 아침, 야시장의 저녁, 정원의 밤을 이어 붙였다.", "2020-01-10",
                    destination("VN", "VNM", "Vietnam", "베트남", "Hanoi", "하노이", "21.0278", "105.8342", "호안끼엠 호수"),
                    destination("MY", "MYS", "Malaysia", "말레이시아", "Kuala Lumpur", "쿠알라룸푸르", "3.1390", "101.6869", "페트로나스 트윈 타워"),
                    destination("SG", "SGP", "Singapore", "싱가포르", "Singapore", "싱가포르", "1.3521", "103.8198", "가든스 바이 더 베이")),
            journey("아시아의 섬들", "화산과 오래된 성벽, 차 향이 남는 섬을 차례로 만났다.", "2019-11-01",
                    destination("ID", "IDN", "Indonesia", "인도네시아", "Denpasar", "덴파사르", "-8.6705", "115.2126", "울루와뚜 사원"),
                    destination("PH", "PHL", "Philippines", "필리핀", "Manila", "마닐라", "14.5995", "120.9842", "인트라무로스"),
                    destination("LK", "LKA", "Sri Lanka", "스리랑카", "Colombo", "콜롬보", "6.9271", "79.8612", "갈레 페이스 그린")),
            journey("히말라야로 가는 길", "델리의 소음에서 산맥의 고요까지 고도를 높여 갔다.", "2019-04-05",
                    destination("IN", "IND", "India", "인도", "New Delhi", "뉴델리", "28.6139", "77.2090", "후마윤의 묘"),
                    destination("NP", "NPL", "Nepal", "네팔", "Kathmandu", "카트만두", "27.7172", "85.3240", "보드나트 스투파"),
                    destination("BT", "BTN", "Bhutan", "부탄", "Thimphu", "팀푸", "27.4728", "89.6390", "붓다 도르덴마")),
            journey("사막과 오래된 도시", "초고층 도시에서 붉은 협곡과 바닷바람이 부는 항구까지.", "2018-11-09",
                    destination("AE", "ARE", "United Arab Emirates", "아랍에미리트", "Dubai", "두바이", "25.2048", "55.2708", "부르즈 할리파"),
                    destination("JO", "JOR", "Jordan", "요르단", "Amman", "암만", "31.9539", "35.9106", "암만 성채"),
                    destination("OM", "OMN", "Oman", "오만", "Muscat", "무스카트", "23.5880", "58.3829", "술탄 카부스 대모스크")),
            journey("남반구의 푸른 도시", "항구 도시와 화산섬, 남태평양의 느린 시간을 기록했다.", "2018-05-04",
                    destination("AU", "AUS", "Australia", "호주", "Sydney", "시드니", "-33.8688", "151.2093", "시드니 오페라하우스"),
                    destination("NZ", "NZL", "New Zealand", "뉴질랜드", "Auckland", "오클랜드", "-36.8509", "174.7645", "스카이 타워"),
                    destination("FJ", "FJI", "Fiji", "피지", "Suva", "수바", "-18.1248", "178.4501", "수바 시립시장")),
            journey("태평양에서 카리브해까지", "서늘한 해안과 거대한 도시, 열대의 숲을 가로질렀다.", "2017-10-06",
                    destination("CA", "CAN", "Canada", "캐나다", "Vancouver", "밴쿠버", "49.2827", "-123.1207", "스탠리 파크"),
                    destination("MX", "MEX", "Mexico", "멕시코", "Mexico City", "멕시코시티", "19.4326", "-99.1332", "소칼로 광장"),
                    destination("CR", "CRI", "Costa Rica", "코스타리카", "San Jose", "산호세", "9.9281", "-84.0907", "국립극장")),
            journey("안데스의 높이", "고산 도시와 태평양 해안, 소금 평원의 빛을 따라갔다.", "2017-04-07",
                    destination("PE", "PER", "Peru", "페루", "Cusco", "쿠스코", "-13.5319", "-71.9675", "아르마스 광장"),
                    destination("CL", "CHL", "Chile", "칠레", "Santiago", "산티아고", "-33.4489", "-70.6693", "산 크리스토발 언덕"),
                    destination("BO", "BOL", "Bolivia", "볼리비아", "La Paz", "라파스", "-16.4897", "-68.1193", "마녀시장")),
            journey("남미의 대서양", "해변의 리듬과 오래된 카페, 강변의 저녁을 만났다.", "2016-11-04",
                    destination("BR", "BRA", "Brazil", "브라질", "Rio de Janeiro", "리우데자네이루", "-22.9068", "-43.1729", "코파카바나 해변"),
                    destination("AR", "ARG", "Argentina", "아르헨티나", "Buenos Aires", "부에노스아이레스", "-34.6037", "-58.3816", "카미니토"),
                    destination("UY", "URY", "Uruguay", "우루과이", "Montevideo", "몬테비데오", "-34.9011", "-56.1645", "람블라 해안")),
            journey("카리브해의 색", "안데스 북쪽에서 음악과 오래된 자동차가 있는 섬들로.", "2016-05-06",
                    destination("CO", "COL", "Colombia", "콜롬비아", "Bogota", "보고타", "4.7110", "-74.0721", "몬세라테 언덕"),
                    destination("CU", "CUB", "Cuba", "쿠바", "Havana", "아바나", "23.1136", "-82.3666", "아바나 구시가지"),
                    destination("DO", "DOM", "Dominican Republic", "도미니카공화국", "Santo Domingo", "산토도밍고", "18.4861", "-69.9312", "콜론 지구")),
            journey("북아프리카의 시간", "고대 유적과 메디나, 지중해의 흰 도시를 이어 보았다.", "2015-10-09",
                    destination("EG", "EGY", "Egypt", "이집트", "Cairo", "카이로", "30.0444", "31.2357", "기자 피라미드"),
                    destination("TN", "TUN", "Tunisia", "튀니지", "Tunis", "튀니스", "36.8065", "10.1815", "시디 부 사이드"),
                    destination("DZ", "DZA", "Algeria", "알제리", "Algiers", "알제", "36.7538", "3.0588", "알제 카스바")),
            journey("동아프리카의 새벽", "붉은 지붕의 도시와 초원, 향신료 섬의 바다를 담았다.", "2015-04-03",
                    destination("KE", "KEN", "Kenya", "케냐", "Nairobi", "나이로비", "-1.2921", "36.8219", "나이로비 국립공원"),
                    destination("TZ", "TZA", "Tanzania", "탄자니아", "Zanzibar City", "잔지바르시티", "-6.1659", "39.2026", "스톤 타운"),
                    destination("ET", "ETH", "Ethiopia", "에티오피아", "Addis Ababa", "아디스아바바", "8.9806", "38.7578", "국립박물관")),
            journey("아프리카 남쪽 끝", "테이블 마운틴에서 사막과 델타까지 넓은 풍경을 건넜다.", "2014-09-05",
                    destination("ZA", "ZAF", "South Africa", "남아프리카공화국", "Cape Town", "케이프타운", "-33.9249", "18.4241", "테이블 마운틴"),
                    destination("BW", "BWA", "Botswana", "보츠와나", "Gaborone", "가보로네", "-24.6282", "25.9231", "가보로네 보호구역"),
                    destination("NA", "NAM", "Namibia", "나미비아", "Windhoek", "빈트후크", "-22.5609", "17.0658", "크리스투스 교회"))
    );

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
        Member traveler = existingTraveler != null
                ? existingTraveler
                : memberRepository.save(Member.create(
                        DEMO_USERNAME,
                        DEMO_DISPLAY_NAME,
                        DEMO_BIO,
                        DEMO_PROFILE_IMAGE_URL));
        traveler.updateProfile(DEMO_DISPLAY_NAME, DEMO_BIO, DEMO_PROFILE_IMAGE_URL);
        memberRepository.save(traveler);

        Set<String> existingTitles = new HashSet<>();
        travelRepository.findOwnedTravels(traveler.getId()).forEach(travel ->
                existingTitles.add(travel.getTitle()));

        seedClassicShowcase(traveler, existingTitles);
        seedGlobalShowcase(traveler, existingTitles);

        int showcaseTravelCount = travelRepository.findOwnedTravels(traveler.getId()).size();
        log.info("Reconciled demo profile '{}' with {} showcase travels", DEMO_USERNAME, showcaseTravelCount);
    }

    private void seedClassicShowcase(Member traveler, Set<String> existingTitles) {

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

        seedIfMissing(existingTitles, "Taipei, again.", () -> seedTaipei(traveler, taiwan, taipei));
        seedIfMissing(existingTitles, "후쿠오카의 사흘", () -> seedFukuoka(traveler, japan, fukuoka));
        seedIfMissing(existingTitles, "Miami & Key West", () -> seedFlorida(traveler, usa, miami, keyWest));
        seedIfMissing(existingTitles, "오키나와, 바다의 시간", () -> seedOkinawa(traveler, japan, naha));
        seedIfMissing(existingTitles, "서울에서 부산까지", () -> seedKorea(traveler, korea, seoul, busan));
        seedIfMissing(existingTitles, "파리의 긴 주말", () -> seedParis(traveler, france, paris));
        seedIfMissing(existingTitles, "방콕, 골목과 강 사이", () -> seedBangkok(traveler, thailand, bangkok));
    }

    private void seedGlobalShowcase(Member traveler, Set<String> existingTitles) {
        for (int journeyIndex = 0; journeyIndex < GLOBAL_SHOWCASE.size(); journeyIndex++) {
            ShowcaseJourney journey = GLOBAL_SHOWCASE.get(journeyIndex);
            int stableIndex = journeyIndex;
            seedIfMissing(existingTitles, journey.title(), () -> {
                LocalDate endDate = journey.startDate().plusDays(8);
                Travel travel = Travel.create(
                        traveler,
                        journey.title(),
                        journey.description(),
                        journey.startDate(),
                        endDate,
                        String.format("/placeholders/cover-%02d.svg", stableIndex % 5 + 1),
                        Visibility.PUBLIC);

                for (int placeIndex = 0; placeIndex < journey.destinations().size(); placeIndex++) {
                    ShowcaseDestination destination = journey.destinations().get(placeIndex);
                    Country country = country(
                            destination.iso2(), destination.iso3(), destination.countryEn(), destination.countryKo(),
                            destination.latitude(), destination.longitude());
                    City city = city(
                            country, destination.cityEn(), destination.cityKo(),
                            destination.latitude(), destination.longitude());
                    travel.addPlace(TravelPlace.create(
                            country,
                            city,
                            destination.landmark(),
                            bd(destination.latitude()),
                            bd(destination.longitude()),
                            journey.startDate().plusDays(placeIndex * 3L),
                            destination.cityKo() + "에서 오래 기억하고 싶은 한 장면.",
                            placeIndex));
                }

                ShowcaseDestination first = journey.destinations().getFirst();
                persist(travel, List.of(photo(
                        0,
                        String.format("/placeholders/photo-%02d.svg", stableIndex % 13 + 1),
                        first.landmark() + "에서",
                        journey.startDate())));
            });
        }
    }

    private static void seedIfMissing(Set<String> existingTitles, String title, Runnable seeder) {
        if (existingTitles.add(title)) {
            seeder.run();
        }
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
        return countryRepository.findByIso2Code(iso2)
                .orElseGet(() -> countryRepository.save(
                        Country.create(iso2, iso3, nameEn, nameKo, bd(lat), bd(lng))));
    }

    private City city(Country country, String nameEn, String nameKo, String lat, String lng) {
        return cityRepository.findByCountryIso2CodeAndNameEnIgnoreCase(country.getIso2Code(), nameEn)
                .orElseGet(() -> cityRepository.save(
                        City.create(country, nameEn, nameKo, bd(lat), bd(lng))));
    }

    private static ShowcaseJourney journey(
            String title,
            String description,
            String startDate,
            ShowcaseDestination... destinations) {
        return new ShowcaseJourney(title, description, LocalDate.parse(startDate), List.of(destinations));
    }

    private static ShowcaseDestination destination(
            String iso2,
            String iso3,
            String countryEn,
            String countryKo,
            String cityEn,
            String cityKo,
            String latitude,
            String longitude,
            String landmark) {
        return new ShowcaseDestination(
                iso2, iso3, countryEn, countryKo, cityEn, cityKo, latitude, longitude, landmark);
    }

    private static PhotoSpec photo(int placeIndex, String imageUrl, String caption, LocalDate takenAt) {
        return new PhotoSpec(placeIndex, imageUrl, caption, takenAt);
    }

    private static BigDecimal bd(String value) {
        return new BigDecimal(value);
    }

    private record PhotoSpec(int placeIndex, String imageUrl, String caption, LocalDate takenAt) {
    }

    private record ShowcaseJourney(
            String title,
            String description,
            LocalDate startDate,
            List<ShowcaseDestination> destinations) {
    }

    private record ShowcaseDestination(
            String iso2,
            String iso3,
            String countryEn,
            String countryKo,
            String cityEn,
            String cityKo,
            String latitude,
            String longitude,
            String landmark) {
    }
}
