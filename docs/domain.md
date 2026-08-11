# Domain Model

## 개요

```
Member ──1:N──► Travel ──1:N──► TravelPlace ──N:1──► Country
                  │                  │                  ▲
                  │                  └──N:1──► City ────┘
                  │                                (nullable)
                  └──1:N──► TravelPhoto ──N:1──► TravelPlace (nullable)
```

핵심은 **`TravelPlace`가 "방문했다"는 사실의 유일한 출처**라는 점입니다.
방문 국가 수, 방문 도시 수, 국가별 여행 횟수가 모두 이 테이블에서 집계됩니다.

---

## Member

한 개의 Travel Globe를 소유하는 사람.

| 필드 | 타입 | 제약 | 설명 |
| --- | --- | --- | --- |
| `id` | Long | PK, identity | |
| `username` | String(30) | **unique**, not null, 수정 불가 | 공개 프로필 URL 핸들 |
| `displayName` | String(60) | not null | 화면에 보이는 이름 |
| `bio` | String(300) | nullable | |
| `profileImageUrl` | String(500) | nullable | |
| `createdAt` / `updatedAt` | Instant | not null | `BaseTimeEntity` |

**설계 메모**

- `username`은 **소문자로 정규화해서 저장**합니다(`Member.normalizeUsername`).
  `/@Traveler`와 `/@traveler`가 같은 프로필이어야 하는데,
  `findByUsernameIgnoreCase`를 쓰면 인덱스를 못 타기 때문입니다. 저장 시 정규화하고
  조회 시에도 같은 함수를 통과시켜 단순 equality 조회를 유지합니다.
- `updatable = false`인 이유는 핸들이 공개 URL이기 때문입니다. 변경을 허용하려면
  리다이렉트를 위한 과거 핸들 이력 테이블이 함께 필요해서, 지금은 열지 않았습니다.
- **인증 정보(비밀번호, 소셜 ID)가 없습니다.** 로그인이 들어올 때 별도 credential
  엔티티로 붙일 예정이며, 그래야 이 엔티티가 "프로필"로 남습니다.

## Country

모든 사용자가 공유하는 국가 마스터 데이터.

| 필드 | 타입 | 제약 | 설명 |
| --- | --- | --- | --- |
| `id` | Long | PK | |
| `iso2Code` | String(2) | **unique**, not null | ISO 3166-1 alpha-2, 대문자 |
| `iso3Code` | String(3) | **unique**, not null | ISO 3166-1 alpha-3 |
| `nameEn` / `nameKo` | String(100) | not null | |
| `latitude` / `longitude` | BigDecimal(9,6) | not null | 마커용 중심 좌표 |

**설계 메모**

- 여행 기록이 국가 이름을 **문자열로 직접 갖지 않는** 이유는 세 가지입니다.
  지구본이 폴리곤을 찾으려면 안정적인 ISO 코드가 필요하고, 마커를 찍으려면 좌표가
  필요하며, 통계가 성립하려면 국가가 셀 수 있는 값이어야 합니다.
- `iso2Code`는 프론트엔드 `public/geo/countries.geo.json`의
  `properties.iso2`와 그대로 매칭됩니다. 이 값이 두 시스템의 연결 고리입니다.
- 좌표는 **라벨 중심(label point)** 이지 기하학적 중심이 아닙니다. 예를 들어 미국은
  알래스카·하와이를 포함한 중심이 아니라 본토 위에 마커가 놓이도록 잡았습니다.
- `BigDecimal(9,6)`인 이유: 경도는 정수부 3자리(±180) + 소수 6자리로 9자리면
  약 0.1m 정밀도까지 표현됩니다. `double`과 달리 PostgreSQL `numeric(9,6)`과
  정확히 대응되어 `ddl-auto=validate`가 의미 있게 동작합니다.

## City

`Country`에 종속된 도시 마스터 데이터.

| 필드 | 타입 | 제약 |
| --- | --- | --- |
| `id` | Long | PK |
| `country` | Country | **LAZY**, not null, FK |
| `nameEn` / `nameKo` | String(100) | not null |
| `latitude` / `longitude` | BigDecimal(9,6) | not null |

`(country_id, name_en)`에 unique 제약이 있습니다. 같은 도시를 두 번 방문했을 때
행이 두 개 생기면 "방문 도시 수" 통계가 거짓말을 하기 때문입니다.

## Travel

여행 한 건. 사용자가 기록하고 탐색하는 단위입니다.

| 필드 | 타입 | 제약 | 설명 |
| --- | --- | --- | --- |
| `id` | Long | PK | |
| `member` | Member | **LAZY**, not null | 소유자 |
| `title` | String(120) | not null | |
| `description` | String(2000) | nullable | |
| `startDate` / `endDate` | LocalDate | not null | `endDate >= startDate` |
| `coverImageUrl` | String(500) | nullable | |
| `visibility` | Visibility | not null, **STRING** | `PUBLIC` / `PRIVATE` |
| `places` | List\<TravelPlace\> | cascade ALL, orphanRemoval | 양방향 |
| `createdAt` / `updatedAt` | Instant | not null | |

**설계 메모**

- `Travel.create()`가 날짜 역전을 거부하고, DB에도 `ck_travels_date_range` 체크
  제약이 있습니다. 애플리케이션과 스키마 양쪽에서 막습니다.
- `places`만 양방향입니다. 여행이 자기 일정의 aggregate root이고
  일정은 여행과 함께 생성·정렬·삭제되기 때문입니다.
  반면 `photos`는 자식 쪽에서 단방향입니다 — 지구본용으로 여행을 읽을 때마다
  사진 목록이 딸려오면 안 되기 때문입니다.
- `getPlaces()`는 `unmodifiableList`를 반환하고 추가는 `addPlace()`로만 가능합니다.
  양방향 연관관계의 두 쪽이 어긋나는 흔한 버그를 구조적으로 막습니다.
- `Visibility`는 `EnumType.STRING`이고 컬럼 길이가 20입니다.
  나중에 `FOLLOWERS`를 추가할 때 스키마 변경이 필요 없습니다.

## TravelPlace

여행 안에서 방문한 한 곳. **국가를 "방문했다"고 만드는 행.**

| 필드 | 타입 | 제약 | 설명 |
| --- | --- | --- | --- |
| `id` | Long | PK | |
| `travel` | Travel | **LAZY**, not null | |
| `country` | Country | **LAZY**, not null | 필수 |
| `city` | City | **LAZY**, nullable | 마스터에 없을 수 있음 |
| `placeName` | String(150) | not null | |
| `latitude` / `longitude` | BigDecimal(9,6) | **nullable** | 정확한 좌표 |
| `visitedAt` | LocalDate | nullable | |
| `memo` | String(1000) | nullable | |
| `sortOrder` | int | not null | 일정 순서 |

**왜 별도의 `Visit` 엔티티를 만들지 않았는가**

`Visit`를 따로 두면 "여행 없이 방문만 한 기록"을 표현할 수 있지만,
그런 행은 지구본에서 클릭해도 보여줄 것이 없습니다. 결국 모든 조회에서
`Travel`과 조인해야 하므로 조인만 하나 늘어납니다. 필요해지는 시점
(예: 여행으로 묶이지 않은 체크인)이 오면 그때 분리하는 편이 낫습니다.

**좌표 폴백**

`resolveLatitude()` / `resolveLongitude()`는 **장소 → 도시 → 국가 중심** 순으로
좌표를 찾습니다. 기록이 성길 때도 마커가 항상 어딘가에 놓이도록 하기 위한 것이고,
API DTO는 이미 해석된 값을 내보내므로 프론트엔드는 폴백을 몰라도 됩니다.

## TravelPhoto

| 필드 | 타입 | 제약 |
| --- | --- | --- |
| `id` | Long | PK |
| `travel` | Travel | **LAZY**, not null |
| `travelPlace` | TravelPlace | **LAZY**, nullable |
| `imageUrl` | String(500) | not null |
| `caption` | String(300) | nullable |
| `takenAt` | LocalDate | nullable |
| `sortOrder` | int | not null |

URL만 저장합니다. 업로드·리사이즈·CDN은 이번 범위 밖이며,
자리표시자 URL을 오브젝트 스토리지 URL로 바꿔도 스키마 변경이 없습니다.

---

## 공통 규칙

### BaseTimeEntity

`createdAt` / `updatedAt`만 갖는 `@MappedSuperclass`이며 JPA Auditing으로 채웁니다.
**`Member`와 `Travel`만 상속합니다.** 마스터 데이터(`Country`, `City`)와
aggregate 내부 행(`TravelPlace`, `TravelPhoto`)은 상속하지 않습니다 —
계층을 한 단계로 유지하기 위해서입니다.

### 연관관계는 전부 LAZY

`@ManyToOne`의 JPA 기본값은 EAGER이므로 모두 명시적으로 `FetchType.LAZY`입니다.
필요한 곳에서는 리포지토리 쿼리가 `join fetch`로 정확히 필요한 만큼만 가져옵니다.
`spring.jpa.open-in-view=false`이므로 서비스 밖에서 지연 로딩이 일어나면
조용히 N+1이 되는 대신 예외로 드러납니다.

### equals / hashCode를 재정의하지 않았다

의도한 선택입니다. Hibernate는 하나의 영속성 컨텍스트 안에서 엔티티당 인스턴스를
하나만 보장하므로, 기본 동일성 비교가 이미 올바르게 동작합니다.
`id` 기반 `equals`는 영속화 전 엔티티(모두 `id == null`)를 `Set`에 넣을 때
서로 같다고 판정되는 고전적인 버그를 만듭니다. 컬렉션은 모두 `List`이고
엔티티를 `Set`이나 맵 키로 쓰지 않으므로 재정의할 이유가 없습니다.

### 엔티티에 setter가 없다

생성은 정적 팩토리(`Member.create`, `Travel.create`, ...), 변경은 의미가 있는
메서드(`updateProfile`, `addPlace`)로만 가능합니다. Lombok은 `@Getter`와
`protected` 기본 생성자에만 씁니다. `@Data`는 쓰지 않습니다 —
`toString`이 지연 로딩을 건드리고 `equals`가 위 문제를 일으키기 때문입니다.
