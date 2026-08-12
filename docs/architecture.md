# Architecture

## 1. 전체 구조

```
┌─────────────────────────┐        HTTP / JSON        ┌──────────────────────────┐
│  Next.js 16 (App Router)│ ────────────────────────► │ Spring Boot 4.1 REST API │
│  localhost:3000         │ ◄──────────────────────── │ localhost:8080           │
│                         │                            │                          │
│  Server Components      │  1) SSR 시 서버→서버 호출  │  Controller              │
│    프로필/여행 최초 조회 │  2) 국가 필터는 브라우저   │  Service                 │
│  Client Components      │     →동일 출처 /api 프록시 │  Repository (JPA)        │
│    지구본, 국가 선택     │                            └────────────┬─────────────┘
└─────────────────────────┘                                         │
         │                                                          │
         │ /geo/countries.geo.json                                  ▼
         │ /placeholders/*.svg           ┌────────────────────────────────────┐
         └── (자체 public 정적 자산)      │ H2 (local) / PostgreSQL (배포)     │
                                         │ 스키마 정답 = Flyway migrations    │
                                         └────────────────────────────────────┘
```

지구본의 국가 경계와 자리표시 이미지는 빌드 시 생성되어 `frontend/public/`에 커밋됩니다.
여행 상세의 도시 지도만 OpenStreetMap 공개 타일을 사용하며, 별도 API 키는 필요하지 않습니다.

## 2. 왜 이 구조인가

### 2.1 저장소 루트를 옮기지 않았다

요구사항은 `backend/`와 `frontend/`를 나란히 두는 예시를 보여주지만,
현재 저장소는 Spring Boot 프로젝트 자체가 루트입니다(`pom.xml`, `src/`, `mvnw`가 루트에 존재).

`src/`와 `pom.xml`을 `backend/`로 옮기면 git 히스토리에 전면 이동이 기록되고,
IDE 설정·실행 구성이 모두 깨집니다. 얻는 것은 대칭적인 폴더 이름뿐입니다.
그래서 루트를 유지하고 `frontend/`, `docs/`를 하위에 추가했습니다.

앞으로 서비스가 여러 개로 늘어나 진짜 모노레포가 필요해지면 그때 옮기는 편이
비용이 같고 근거는 더 분명합니다.

### 2.2 패키지명을 바꾸지 않았다

base package는 `com.travelglobe.trableglobeapi`입니다
(artifactId의 `trable`은 오타로 보이지만) 전체 rename은 되돌리기 어려운 변경이라
요구사항이 금지한 항목에 해당합니다. 그대로 두고 하위에 도메인 패키지를 추가했습니다.

### 2.3 로컬 기본 DB가 H2인 이유

| 프로필 | DB | 스키마 | 시드 |
| --- | --- | --- | --- |
| `local` (기본) | H2 in-memory | Hibernate `create-drop` | O |
| `postgres` | 로컬 PostgreSQL | **Flyway** + `validate` | O |
| `prod` | 환경변수 PostgreSQL | **Flyway** + `validate` | X |
| `demo` | 환경변수 PostgreSQL | **Flyway** + `validate` | O |

PostgreSQL이 배포 대상이라는 점은 바뀌지 않습니다. 다만 이 프로젝트의 1차 목표가
"clone 후 바로 지구본이 보이는 것"이라, 새 개발자가 DB 설치부터 해야 하는 상태로
두지 않았습니다.

스키마의 **정답은 항상 `db/migration/` 아래 Flyway 마이그레이션**입니다.
`local`에서만 엔티티로부터 스키마를 생성하고, 실제 PostgreSQL을 쓰는 두 프로필에서는
`ddl-auto=validate`가 엔티티와 마이그레이션의 어긋남을 기동 시점에 잡아냅니다.
따라서 엔티티를 고치면 마이그레이션도 함께 고쳐야 하며, 잊으면 `postgres` 프로필이
뜨지 않아 즉시 드러납니다.

### 2.4 `profile` 패키지를 따로 둔 이유

요구사항의 예시 패키지 구성은 member / travel / location / statistics 네 개입니다.
그런데 프로필 화면 하나가 이 넷을 모두 읽습니다.

`MemberService`가 `TravelRepository`를 직접 호출하게 만들면 member 도메인이
travel 도메인을 알게 되고, 반대도 마찬가지입니다. 그래서 조합만 담당하는
읽기 파사드 `profile` 패키지를 두었습니다.

```
ProfileController ─► ProfileService ─┬─► MemberService            (member)
                                     ├─► TravelQueryService       (travel)
                                     ├─► TravelStatisticsService  (statistics)
                                     ├─► TravelRepository         (방문 국가 집계)
                                     └─► CountryRepository        (국가 코드 검증)
```

각 도메인 패키지는 자기 관심사만 알고, 화면용 조합은 한 곳에 모입니다.

### 2.5 URI를 `/api/profiles/...` 복수형 + 중첩으로 바꿨다

요구사항 예시는 `/api/profile/{username}`과
`/api/countries/{code}/travels?username=...`였습니다. 두 가지를 바꿨습니다.

- **복수형 `profiles`** — 컬렉션 아래의 항목이라는 통상적 REST 규칙에 맞춥니다.
- **국가별 여행을 프로필 하위로 중첩** — 조회 대상은 "그 국가의 여행"이 아니라
  "**이 사용자의** 그 국가 여행"입니다. 소유자는 쿼리 파라미터가 아니라 경로에
  있어야 리소스를 정확히 가리킵니다.

### 2.6 조회 전용 API만 만들었다

쓰기 API는 인증과 함께 들어와야 합니다. 소유권 검사 없는 `POST /api/travels`는
누구나 남의 프로필에 여행을 쓸 수 있는 엔드포인트이기 때문에, 껍데기라도 열어두지
않았습니다. 대신 서비스 이름을 `TravelQueryService`로 두어 나중에
`TravelCommandService`가 추가될 자리를 비워 두었습니다.

## 3. 데이터 흐름

### 3.1 프로필 최초 렌더 (SSR)

```
브라우저 → GET /traveler
             Next.js Server Component
               └─ Promise.all([
                    GET /api/profiles/traveler,
                    GET /api/profiles/traveler/countries,
                    GET /api/profiles/traveler/travels ])   ← 서버에서 병렬 호출
             ← HTML (프로필·카드·타임라인 포함)
브라우저 → GET /geo/countries.geo.json     (지구본 폴리곤, 클라이언트)
         → react-globe.gl 청크 + three.js  (dynamic import, ssr:false)
```

세 요청을 `Promise.all`로 묶어 워터폴을 피합니다. 지구본 관련 자산은 클라이언트에서만
받으므로 첫 HTML에는 three.js가 들어가지 않습니다.

### 3.2 국가 선택

```
마커 클릭 / 국가 칩 클릭 / 키보드
   → selectedCode 상태 변경 (ProfileExperience)
   → 지구본: 폴리곤 색·고도 변경 + pointOfView() 카메라 이동
   → 카드 목록: 이미 받아둔 목록에서 즉시 필터 (지연 0)
   → 동시에 동일 출처 /api 프록시로 국가별 여행 API 확인
        성공 → 서버 결과로 교체
        실패 → 즉시 필터 결과 유지
```

즉시 필터와 서버 확인을 함께 쓰는 이유는, 클릭 반응은 즉각적이어야 하고
목록이 페이지네이션되는 시점부터는 서버가 정답이어야 하기 때문입니다.
브라우저 요청은 Next.js의 동일 출처 `/api` 프록시를 사용하므로, 일반 배포에서는 별도
CORS 왕복 없이 프리뷰 URL과 커스텀 도메인에서도 같은 방식으로 동작합니다.

## 4. 프론트엔드 구성 원칙

- **Server Component가 기본**입니다. 상태가 필요한 지구본·선택 로직만 `"use client"`입니다.
- 데이터 접근은 `src/lib/api/*`에만 있습니다. 컴포넌트에 `fetch` URL이 흩어지지 않습니다.
- 응답 타입은 `src/types/index.ts`가 백엔드 DTO와 1:1 대응합니다.
- 전역 상태 라이브러리를 넣지 않았습니다. 공유 상태가 `selectedCountry` 하나이고
  페이지를 넘나들며 유지할 필요가 없기 때문입니다. 실제로 필요해지면 그때 도입합니다.

## 5. 접근성 설계

WebGL 캔버스는 스크린 리더가 읽을 DOM이 없고 마커에 포커스를 줄 수도 없습니다.
그래서 **지구본을 필수 경로로 두지 않았습니다.**

- 지구본에 있는 모든 국가가 아래 국가 칩 목록에 실제 `<button>`으로도 존재하고,
  같은 선택 상태를 조작합니다 (`CountryKeyboardList`).
- 지구본 컨테이너 자체도 포커스 가능하며 방향키 회전 / `+`·`-` 확대·축소 / `0` 초기화를 지원합니다.
- 확대·축소 버튼을 별도 toolbar로 제공합니다.
- 선택 결과는 `aria-live` 영역으로 알립니다.
- `prefers-reduced-motion`에서 자동 회전·마커 펄스·카메라 트랜지션을 끕니다.

이 구조는 기존 BioIN 정책지도의 "지도 국가별 키보드 선택 목록" 패턴을 참고했습니다.

## 6. 보안

- DB 비밀번호·CORS 오리진은 전부 환경변수이며, 어떤 yaml에도 값이 없습니다.
- CORS는 `/api/**`에 대해 설정된 오리진 목록에만 허용합니다. 와일드카드를 쓰지 않습니다.
- `server.error.include-stacktrace=never`, 전역 예외 처리기는 예기치 못한 예외를
  로그에만 남기고 응답에는 고정 문구를 내보냅니다.
- 존재하지 않는 프로필과 비공개 프로필의 응답이 동일한 404입니다(존재 여부 탐색 방지).
- 모든 공개 조회 쿼리가 `Visibility`를 명시적으로 인자로 받습니다.
  기본값을 두지 않았기 때문에 필터를 빠뜨리면 컴파일이 되지 않습니다.

## 7. 알려진 한계

- **여행 목록에 페이지네이션이 없습니다.** fetch join으로 컬렉션을 함께 가져오기 때문에
  페이징을 붙이면 Hibernate가 메모리에서 정렬합니다. 개인 여행 건수 규모에서는
  문제가 없지만, 커지면 목록 조회와 상세 조회를 분리해야 합니다.
- **`notFound()`가 HTTP 200으로 응답합니다.** 동적 스트리밍 렌더에서는 응답 헤더가
  먼저 확정되기 때문입니다. Next.js는 이 경우 `<meta name="robots" content="noindex">`를
  자동으로 삽입하므로 색인 문제는 없지만, 상태 코드로 404를 감지하는 모니터링에는
  주의가 필요합니다.
- **`local` 프로필은 재시작하면 데이터가 사라집니다.** in-memory H2이기 때문이며 의도된 동작입니다.
