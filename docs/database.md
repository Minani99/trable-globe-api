# Database

## 스키마의 정답

`src/main/resources/db/migration/` 아래의 순차 Flyway 마이그레이션이 정답입니다.
`V1`은 여행 스키마, `V2`는 계정 자격 증명과 로그인 세션, `V3`는 이메일 인증과
비밀번호 재설정용 일회성 토큰을 추가합니다. 최신 `V8`은 여행별 총예산, 비용과
결제 상태, 날짜별 예약과 확정 상태를 추가합니다.

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
> 스키마 변경은 이미 배포된 파일을 고치지 말고 다음 번호의 `V4__...sql`을 추가하세요.

## ERD

```
              ┌──────────────────────┐       ┌──────────────────┐
              │ member_credentials   │       │  auth_sessions   │
              │──────────────────────│       │──────────────────│
              │ member_id      FK/UQ │       │ id UUID       PK │
              │ email             UQ │       │ member_id     FK │
              │ password_hash         │       │ token_hash     UQ │
              └──────────┬───────────┘       │ expires_at       │
                         │ 1                 │ revoked_at       │
                         │                   └────────┬─────────┘
                         │                           │ N
                    ┌────▼─────────────┐◄────────────┘
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
| members → member_credentials | 1 : 0..1 | 선택(데모 계정) | `ON DELETE CASCADE` |
| members → auth_sessions | 1 : N | 필수 | `ON DELETE CASCADE` |
| member_credentials → account_action_tokens | 1 : N | 필수 | `ON DELETE CASCADE` |
| travels → travel_places | 1 : N | 필수 | `ON DELETE CASCADE` |
| travels → travel_photos | 1 : N | 필수 | `ON DELETE CASCADE` |
| travels → travel_budgets | 1 : 0..1 | 선택 | `ON DELETE CASCADE` |
| travels → travel_expenses | 1 : N | 필수 | `ON DELETE CASCADE` |
| travels → travel_reservations | 1 : N | 필수 | `ON DELETE CASCADE` |
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
| `idx_travel_expenses_travel` | `travel_expenses(travel_id, sort_order)` | 계획 보드 비용 순서 조회 |
| `idx_travel_reservations_travel` | `travel_reservations(travel_id, reservation_date, sort_order)` | 예약 날짜·순서 조회 |
| `uk_member_credentials_email` | `member_credentials(email)` | 로그인 식별자 및 중복 가입 방지 |
| `uk_auth_sessions_token_hash` | `auth_sessions(token_hash)` | 원문 토큰을 저장하지 않는 세션 조회 |
| `idx_auth_sessions_expiry` | `auth_sessions(revoked_at, expires_at)` | 만료·폐기 세션 정리 |
| `uk_account_action_tokens_hash` | `account_action_tokens(token_hash)` | 원문 토큰을 저장하지 않는 일회성 조회 |
| `idx_account_action_tokens_expiry` | `account_action_tokens(consumed_at, expires_at)` | 사용·만료 토큰 정리 |

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

- **백업과 복구**: Neon 보존 기간을 확인하고 월 1회 시점 복구 리허설을 합니다.
  구체적인 절차와 기록 양식은 [`operations.md`](./operations.md)에 있습니다.
- **커넥션 풀**: 운영 기본값은 인스턴스당 최대 5개, 최소 유휴 0개입니다. 서버
  인스턴스를 늘릴 때는 `인스턴스 수 × DB_POOL_MAX_SIZE`가 DB 연결 예산을 넘지 않게 합니다.
- **페이지네이션 부재**: 여행 목록 조회가 fetch join으로 컬렉션을 함께 가져오므로
  현재 페이징을 붙일 수 없습니다. 한 사용자의 여행이 수백 건을 넘기 시작하면
  목록 쿼리를 요약 전용 projection으로 분리해야 합니다.
- **비밀번호**: PBKDF2-HMAC-SHA256(개별 salt, 310,000회) 결과만 저장합니다.
- **세션**: 브라우저가 받은 원문 토큰은 Next.js의 HttpOnly 쿠키에만 있고 DB에는
  SHA-256 해시만 저장합니다. 로그아웃 시 해당 세션을 즉시 폐기합니다.
- **자동 정리**: 매일 UTC 03:17에 보존 기간(기본 7일)이 지난 만료·폐기 세션과
  사용·만료된 계정 토큰을 삭제합니다. `AUTH_CLEANUP_RETENTION_DAYS`로 조정할 수 있습니다.
- **출시 전 분리**: 공개 샘플용 DB와 실제 회원 DB를 공유하지 않습니다. Neon의
  별도 프로젝트/브랜치와 최소 권한 애플리케이션 role을 사용합니다.
