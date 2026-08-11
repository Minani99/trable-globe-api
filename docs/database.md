# Database

## 스키마의 정답

`src/main/resources/db/migration/V1__init_travel_globe_schema.sql` 하나입니다.

| 프로필 | DB | 스키마를 만드는 주체 | Hibernate |
| --- | --- | --- | --- |
| `local` (기본) | H2 in-memory | Hibernate (엔티티 기준) | `create-drop` |
| `postgres` | 로컬 PostgreSQL | **Flyway** | `validate` |
| `prod` | 환경변수 PostgreSQL | **Flyway** | `validate` |

`local`에서 Flyway를 끈 이유는 마이그레이션이 PostgreSQL 방언(`bigserial`,
`timestamp with time zone`, `comment on`)으로 작성되어 있기 때문입니다.
H2 호환 버전을 따로 유지하면 두 스키마가 서서히 어긋나므로,
로컬은 엔티티에서 생성하고 진짜 검증은 PostgreSQL 프로필에서 합니다.

> **엔티티를 수정하면 마이그레이션도 같이 수정해야 합니다.**
> 잊으면 `postgres` 프로필이 `validate` 단계에서 기동에 실패하므로 즉시 드러납니다.
> 스키마 변경은 `V1`을 고치지 말고 `V2__...sql`을 추가하세요.

## ERD

```
                    ┌──────────────────┐
                    │     members      │
                    │──────────────────│
                    │ id           PK  │
                    │ username     UQ  │
                    │ display_name     │
                    │ bio              │
                    │ profile_image_url│
                    │ created_at       │
                    │ updated_at       │
                    └────────┬─────────┘
                             │ 1
                             │
                             │ N
                    ┌────────▼─────────┐
                    │     travels      │
                    │──────────────────│
                    │ id           PK  │
                    │ member_id    FK  │
                    │ title            │
                    │ description      │
                    │ start_date       │
                    │ end_date         │  CHECK end_date >= start_date
                    │ cover_image_url  │
                    │ visibility       │  PUBLIC | PRIVATE
                    │ created_at       │
                    │ updated_at       │
                    └───┬──────────┬───┘
                      1 │          │ 1
                        │          │
                      N │          │ N
        ┌───────────────▼──┐   ┌───▼──────────────┐
        │  travel_places   │   │  travel_photos   │
        │──────────────────│   │──────────────────│
        │ id           PK  │◄──┤ travel_place_id  │ (nullable, ON DELETE SET NULL)
        │ travel_id    FK  │ 1 │ id           PK  │
        │ country_id   FK  │ N │ travel_id    FK  │
        │ city_id      FK  │   │ image_url        │
        │ place_name       │   │ caption          │
        │ latitude    NULL │   │ taken_at         │
        │ longitude   NULL │   │ sort_order       │
        │ visited_at  NULL │   └──────────────────┘
        │ memo        NULL │
        │ sort_order       │
        └──┬────────────┬──┘
         N │            │ N
           │            │
         1 │            │ 1  (nullable)
   ┌───────▼──────┐  ┌──▼─────────────┐
   │  countries   │  │     cities     │
   │──────────────│  │────────────────│
   │ id       PK  │◄─┤ country_id  FK │
   │ iso2_code UQ │ 1│ id          PK │
   │ iso3_code UQ │ N│ name_en        │
   │ name_en      │  │ name_ko        │  UQ (country_id, name_en)
   │ name_ko      │  │ latitude       │
   │ latitude     │  │ longitude      │
   │ longitude    │  └────────────────┘
   └──────────────┘
```

## 카디널리티 요약

| 관계 | 카디널리티 | Null | 삭제 동작 |
| --- | --- | --- | --- |
| members → travels | 1 : N | 필수 | 제한 (기본) |
| travels → travel_places | 1 : N | 필수 | `ON DELETE CASCADE` |
| travels → travel_photos | 1 : N | 필수 | `ON DELETE CASCADE` |
| travel_places → countries | N : 1 | **필수** | 제한 |
| travel_places → cities | N : 1 | **선택** | 제한 |
| travel_photos → travel_places | N : 1 | **선택** | `ON DELETE SET NULL` |
| cities → countries | N : 1 | 필수 | 제한 |

여행을 지우면 일정과 사진이 함께 사라집니다(aggregate 경계).
반대로 마스터 데이터(국가·도시)는 참조하는 여행이 있으면 지워지지 않습니다.
사진에 붙은 일정만 지우면 사진은 남고 연결만 끊깁니다.

## 인덱스

| 인덱스 | 대상 | 이유 |
| --- | --- | --- |
| `uk_members_username` | `members(username)` | 모든 프로필 조회의 진입점 |
| `uk_countries_iso2` / `uk_countries_iso3` | `countries` | 코드 조회 및 중복 방지 |
| `uk_cities_country_name_en` | `cities(country_id, name_en)` | 도시 중복 방지 → 통계 정확도 |
| `idx_travels_member_start_date` | `travels(member_id, start_date DESC)` | 프로필 여행 목록은 항상 최신순 |
| `idx_travels_visibility` | `travels(visibility)` | 공개 필터 |
| `idx_travel_places_travel` | `travel_places(travel_id, sort_order)` | 일정 순서 조회 |
| `idx_travel_places_country` | `travel_places(country_id)` | 방문 국가 집계 GROUP BY |
| `idx_travel_places_city` | `travel_places(city_id)` | 방문 도시 집계 |
| `idx_travel_photos_travel` | `travel_photos(travel_id, sort_order)` | 상세 화면 사진 조회 |

## 타입 선택

| 논리 타입 | PostgreSQL | Java | 이유 |
| --- | --- | --- | --- |
| PK | `bigserial` | `Long` + `IDENTITY` | 시퀀스 왕복 없이 삽입 |
| 좌표 | `numeric(9,6)` | `BigDecimal` | 경도 ±180 + 소수 6자리 = 9자리. `double`과 달리 정확히 대응되어 `validate`가 유의미 |
| 시각 | `timestamp with time zone` | `Instant` | UTC 저장, 표시 시 변환 |
| 날짜 | `date` | `LocalDate` | 여행 날짜는 시각·시간대가 무의미 |
| enum | `varchar(20)` | `EnumType.STRING` | 값 추가 시 재번호 부여 불필요 |

## 시드 데이터

`SeedDataLoader`가 `travel-globe.seed.enabled=true`일 때만 동작합니다
(`local`·`postgres`는 true, **`prod`는 false**).

`traveler` 핸들이 이미 있으면 아무것도 하지 않으므로,
영속 DB에 대해 재시작해도 중복이 생기지 않습니다.

들어가는 데이터 — 전부 가공된 예시입니다:

| 항목 | 수 |
| --- | --- |
| Member | 1 (`@traveler`) |
| Country | 4 (KR, JP, TW, US) |
| City | 7 (Seoul, Busan, Fukuoka, Naha, Taipei, Miami, Key West) |
| Travel | 5 (전부 `PUBLIC`) |
| TravelPlace | 13 |
| TravelPhoto | 13 |

이미지 URL은 `frontend/public/placeholders/`에 생성해 둔 SVG를 가리킵니다.
외부 이미지 서비스에 의존하지 않으므로 오프라인에서도 화면이 완성됩니다.

## 운영 시 확인 사항

- **백업**: 이번 범위에 백업 자동화는 없습니다. 배포 전 `pg_dump` 스케줄이 필요합니다.
- **커넥션 풀**: HikariCP 기본값을 그대로 씁니다. 트래픽 측정 후 조정하세요.
- **페이지네이션 부재**: 여행 목록 조회가 fetch join으로 컬렉션을 함께 가져오므로
  현재 페이징을 붙일 수 없습니다. 한 사용자의 여행이 수백 건을 넘기 시작하면
  목록 쿼리를 요약 전용 projection으로 분리해야 합니다.
