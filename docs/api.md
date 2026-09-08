# API Reference

Base URL: `http://localhost:8080` (개발). Next.js 서버와 동일 출처 `/api` 프록시는
`API_BASE_URL`로 대상을 지정합니다. 브라우저 직접 호출이 꼭 필요한 경우에만
`NEXT_PUBLIC_API_BASE_URL`을 사용합니다.

아래 예시는 모두 시드 데이터가 들어간 실행 중인 서버에서 실제로 받은 응답입니다.

---

## 공통 규약

### 응답 봉투

성공:

```json
{
  "success": true,
  "data": { },
  "message": null
}
```

실패:

```json
{
  "success": false,
  "data": null,
  "message": "프로필을 찾을 수 없습니다: nobody",
  "error": { "code": "RESOURCE_NOT_FOUND" }
}
```

`error`는 실패 응답에만 존재합니다. HTTP 상태 코드도 정상적으로 사용하므로
클라이언트는 상태 코드와 `success` 중 편한 쪽을 쓰면 됩니다.

### 오류 코드

| `error.code` | HTTP | 발생 조건 |
| --- | --- | --- |
| `RESOURCE_NOT_FOUND` | 404 | 프로필·여행·국가가 없거나 비공개 |
| `INVALID_REQUEST` | 400 | 사용자명이 비었거나 너무 김, 국가 코드 형식 오류 |
| `VALIDATION_FAILED` | 400 | Bean Validation 실패 (`error.fieldErrors` 포함) |
| `AUTHENTICATION_REQUIRED` | 401 | 없거나 만료·폐기된 세션 |
| `AUTHENTICATION_FAILED` | 401 | 로그인 정보 불일치 |
| `ACCESS_DENIED` | 403 | 허용되지 않은 출처 또는 작업 |
| `CONFLICT` | 409 | 중복 사용자명·이메일 |
| `INTERNAL_ERROR` | 500 | 예기치 못한 예외 — 상세는 서버 로그에만 |

`VALIDATION_FAILED`일 때만 필드 오류가 함께 옵니다:

```json
{
  "success": false,
  "data": null,
  "message": "입력값이 올바르지 않습니다.",
  "error": {
    "code": "VALIDATION_FAILED",
    "fieldErrors": [{ "field": "title", "message": "필수 항목입니다." }]
  }
}
```

거부당한 값 자체는 응답에 담지 않습니다(사용자 입력을 그대로 되돌려주지 않기 위해).

### 가시성

공개 조회 API는 **`visibility = PUBLIC`인 여행만** 반환합니다.
비공개 리소스와 존재하지 않는 리소스는 **같은 404**를 냅니다 —
응답 차이로 존재 여부를 알아내지 못하게 하기 위한 것입니다.

### 사용자명

대소문자를 구분하지 않습니다. `/api/profiles/TRAVELER`와 `/api/profiles/traveler`는
같은 프로필이며, 응답의 `username`은 항상 정규화된 소문자입니다.

---

## GET /api/health

```json
{
  "success": true,
  "data": {
    "status": "UP",
    "database": "UP",
    "serverTime": "2026-08-11T01:27:18.962862800Z",
    "commit": "f70d82b...",
    "environment": "travel-globe-api"
  },
  "message": null
}
```

---

## 연간 리캡 편집

- `GET /api/profiles/{username}/recaps`: 공개 프로필의 연도별 리캡 문장과 대표 여행 순서
- `PUT /api/private/recaps/{year}`: 내 리캡 문장과 대표 공개 여행 최대 3개 저장
- `DELETE /api/private/recaps/{year}`: 자동 생성되는 기본 리캡으로 복구

대표 여행은 해당 회원이 같은 연도에 공개한 여행만 허용합니다. 여행이 비공개로
바뀌거나 삭제되면 공개 응답에서 자동으로 제외됩니다.

---

## GET /api/profiles/{username}

프로필 기본 정보와 통계.

**200**

```json
{
  "success": true,
  "data": {
    "username": "traveler",
    "displayName": "샘플 여행자",
    "bio": "기록으로 남기는 나의 여행 지도",
    "profileImageUrl": "/placeholders/avatar.svg",
    "joinedAt": "2026-08-11T00:43:12.886822Z",
    "statistics": {
      "countryCount": 4,
      "cityCount": 7,
      "travelCount": 5,
      "placeCount": 13,
      "firstTravelDate": "2025-04-04",
      "latestTravelDate": "2026-05-18"
    }
  },
  "message": null
}
```

**404** — 존재하지 않는 사용자명

```json
{
  "success": false,
  "data": null,
  "message": "프로필을 찾을 수 없습니다: nobody",
  "error": { "code": "RESOURCE_NOT_FOUND" }
}
```

---

## GET /api/profiles/{username}/statistics

위 응답의 `statistics` 객체만 단독으로 반환합니다.
카운트는 절대 `null`이 아니며, 여행이 없으면 모두 `0`이고 날짜는 `null`입니다.

```json
{
  "success": true,
  "data": {
    "countryCount": 4,
    "cityCount": 7,
    "travelCount": 5,
    "placeCount": 13,
    "firstTravelDate": "2025-04-04",
    "latestTravelDate": "2026-05-18"
  },
  "message": null
}
```

---

## GET /api/profiles/{username}/countries

**지구본이 마커를 그리는 데 쓰는 엔드포인트.**
`travelCount` 내림차순, 같으면 `nameEn` 오름차순으로 정렬됩니다.

```json
{
  "success": true,
  "data": [
    {
      "iso2Code": "JP",
      "iso3Code": "JPN",
      "nameEn": "Japan",
      "nameKo": "일본",
      "latitude": 36.204824,
      "longitude": 138.252924,
      "travelCount": 2,
      "cityCount": 2,
      "lastVisitedAt": "2026-03-08"
    },
    {
      "iso2Code": "KR",
      "iso3Code": "KOR",
      "nameEn": "South Korea",
      "nameKo": "대한민국",
      "latitude": 35.907757,
      "longitude": 127.766922,
      "travelCount": 1,
      "cityCount": 2,
      "lastVisitedAt": "2025-04-07"
    }
  ],
  "message": null
}
```

`iso2Code`는 프론트엔드 `public/geo/countries.geo.json`의 `properties.iso2`와
그대로 매칭되어 지구본 폴리곤을 찾습니다.

---

## GET /api/profiles/{username}/travels

여행 목록, 최신순(`startDate` 내림차순). 여행 카드에 필요한 만큼만 담습니다.

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Taipei, again.",
      "description": "밤거리부터 위스키 바까지, 짧게 다녀온 세 번째 대만 여행.",
      "startDate": "2026-05-16",
      "endDate": "2026-05-18",
      "durationDays": 3,
      "coverImageUrl": "/placeholders/cover-01.svg",
      "primaryCountry": {
        "iso2Code": "TW", "iso3Code": "TWN",
        "nameEn": "Taiwan", "nameKo": "대만",
        "latitude": 23.69781, "longitude": 120.960515
      },
      "primaryCity": {
        "id": 5, "nameEn": "Taipei", "nameKo": "타이베이",
        "latitude": 25.032969, "longitude": 121.565418
      },
      "countries": [
        { "iso2Code": "TW", "iso3Code": "TWN", "nameEn": "Taiwan", "nameKo": "대만",
          "latitude": 23.69781, "longitude": 120.960515 }
      ],
      "routePoints": [
        { "latitude": 25.033964, "longitude": 121.564468,
          "label": "타이베이 101", "countryCode": "TW" },
        { "latitude": 25.042141, "longitude": 121.507654,
          "label": "시먼딩", "countryCode": "TW" }
      ],
      "placeCount": 3,
      "photoCount": 3
    }
  ],
  "message": null
}
```

- `primaryCountry` / `primaryCity`는 일정의 **첫 번째 장소**에서 나옵니다.
  장소가 없는 여행이면 둘 다 `null`입니다.
- `countries`는 그 여행이 거친 **모든 국가**를 일정 순서대로 중복 없이 담습니다.
  프론트엔드가 국가 선택에 따라 카드를 필터링할 때 씁니다.
- `routePoints`는 장소 → 도시 → 국가 중심점 순으로 좌표를 보완한 **전체 방문 장소 동선**입니다.
  공개 프로필의 지구본 이동선과 연결 거리 계산에 일정 순서 그대로 사용합니다.
- `durationDays`는 시작일과 종료일을 모두 포함해 셉니다(당일치기 = 1).

---

## GET /api/profiles/{username}/countries/{countryCode}/travels

해당 국가를 한 번이라도 거친 여행만 반환합니다. 응답 형식은 위 목록과 동일합니다.

- `countryCode`는 ISO 3166-1 alpha-2이며 대소문자를 구분하지 않습니다 (`jp`, `JP` 모두 가능).
- 반환된 여행에는 **그 여행의 모든 장소**가 포함됩니다(해당 국가 장소만 걸러내지 않습니다).

> 요구사항의 `/api/countries/{code}/travels?username=...` 대신 프로필 하위로
> 중첩했습니다. 조회 대상이 "그 국가의 여행"이 아니라 "**이 사용자의** 그 국가 여행"이므로
> 소유자가 경로에 있어야 리소스를 정확히 가리킵니다.

**400** — 형식이 잘못된 국가 코드

```json
{
  "success": false,
  "data": null,
  "message": "국가 코드는 2자리 ISO 코드여야 합니다: JAPAN",
  "error": { "code": "INVALID_REQUEST" }
}
```

**404** — 형식은 맞지만 등록되지 않은 국가 (예: `ZZ`)

---

## GET /api/travels/{travelId}

여행 상세. 상세 화면이 필요한 모든 것을 한 번에 담습니다.

```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "Taipei, again.",
    "description": "밤거리부터 위스키 바까지, 짧게 다녀온 세 번째 대만 여행.",
    "startDate": "2026-05-16",
    "endDate": "2026-05-18",
    "durationDays": 3,
    "coverImageUrl": "/placeholders/cover-01.svg",
    "visibility": "PUBLIC",
    "owner": {
      "username": "traveler",
      "displayName": "샘플 여행자",
      "profileImageUrl": "/placeholders/avatar.svg"
    },
    "countries": [
      { "iso2Code": "TW", "iso3Code": "TWN", "nameEn": "Taiwan", "nameKo": "대만",
        "latitude": 23.69781, "longitude": 120.960515 }
    ],
    "places": [
      {
        "id": 1,
        "placeName": "닝샤 야시장",
        "country": { "iso2Code": "TW", "iso3Code": "TWN", "nameEn": "Taiwan", "nameKo": "대만",
                     "latitude": 23.69781, "longitude": 120.960515 },
        "city": { "id": 5, "nameEn": "Taipei", "nameKo": "타이베이",
                  "latitude": 25.032969, "longitude": 121.565418 },
        "latitude": 25.055,
        "longitude": 121.515,
        "visitedAt": "2026-05-16",
        "memo": "첫날 밤은 언제나 야시장부터.",
        "sortOrder": 0
      }
    ],
    "photos": [
      {
        "id": 1,
        "imageUrl": "/placeholders/photo-01.svg",
        "caption": "야시장의 첫 저녁",
        "takenAt": "2026-05-16",
        "sortOrder": 0,
        "travelPlaceId": 1
      }
    ],
    "previousTravel": { "id": 2, "title": "후쿠오카의 사흘", "startDate": "2026-03-06" },
    "nextTravel": null
  },
  "message": null
}
```

- `places[].latitude` / `longitude`는 **이미 해석된 값**입니다. 서버가
  장소 → 도시 → 국가 중심 순으로 폴백하므로 클라이언트는 그대로 찍기만 하면 됩니다.
- `previousTravel`은 시간상 **더 이전** 여행, `nextTravel`은 **더 이후** 여행입니다.
  양 끝에서는 `null`입니다.
- `photos[].travelPlaceId`는 특정 장소에 붙지 않은 사진이면 `null`입니다.

**404** — 없거나 비공개인 여행

```json
{
  "success": false,
  "data": null,
  "message": "여행 기록을 찾을 수 없습니다: 999999",
  "error": { "code": "RESOURCE_NOT_FOUND" }
}
```

---

## CORS

`/api/**`에 대해 `travel-globe.cors.allowed-origins`에 나열된 오리진에만 허용합니다.

| 프로필 | 허용 오리진 |
| --- | --- |
| `local`, `postgres` | `http://localhost:3000` |
| `prod` | `CORS_ALLOWED_ORIGINS` 환경변수 (쉼표 구분) |

와일드카드(`*`)는 쓰지 않습니다. 허용 메서드는 `GET, POST, PUT, PATCH, DELETE, OPTIONS`,
허용 헤더는 `Content-Type, Accept, Authorization`, 자격 증명은 비활성입니다.

---

## 여행 교류 API

| Method | Path | 인증 | 설명 |
| --- | --- | --- | --- |
| GET | `/api/travels/{travelId}/social` | 없음 | 좋아요 수와 최근 댓글 100개 조회 |
| GET | `/api/private/travels/{travelId}/social` | 필요 | 내 좋아요·댓글 삭제 권한을 포함해 조회 |
| POST | `/api/private/travels/{travelId}/likes` | 필요 | 좋아요 토글 |
| POST | `/api/private/travels/{travelId}/comments` | 필요 | 500자 이내 댓글 작성 |
| DELETE | `/api/private/travels/{travelId}/comments/{commentId}` | 필요 | 댓글 작성자 또는 여행 소유자가 삭제 |

교류 API는 `PUBLIC` 여행에만 접근할 수 있습니다. 댓글 전체 개수는 `commentCount`로
반환하고, 본문 목록은 화면 성능과 남용 방지를 위해 최신 100개까지만 제공합니다.

## 회원 탐색과 팔로우 API

| Method | Path | 인증 | 설명 |
| --- | --- | --- | --- |
| GET | `/api/discovery/search?query={query}&limit={n}` | 없음 | 이름·사용자명으로 공개 프로필 검색 |
| GET | `/api/discovery/recommendations?limit={n}` | 없음 | 공개 여행 활동 기준 추천 |
| GET | `/api/private/discovery/search?query={query}&limit={n}` | 필요 | 팔로우 상태·공통 여행지를 포함한 검색 |
| GET | `/api/private/discovery/recommendations?limit={n}` | 필요 | 공통 방문 국가와 활동성을 반영한 개인화 추천 |
| GET | `/api/private/discovery/profiles/{username}` | 필요 | 현재 팔로우 관계와 팔로워·팔로잉 수 |
| POST | `/api/private/discovery/profiles/{username}/follow` | 필요 | 회원 팔로우 |
| DELETE | `/api/private/discovery/profiles/{username}/follow` | 필요 | 팔로우 취소 |

추천은 정밀 위치나 연락처를 수집하지 않습니다. 로그인 사용자는 공통 방문 국가 수,
공개 여행 수, 팔로워 수 순으로 추천받고 이미 팔로우한 회원과 본인은 제외됩니다.
비로그인 사용자는 공개 여행 활동을 기준으로 여행자를 둘러볼 수 있습니다. 검색·추천
응답은 최대 24명이며, 팔로우는 중복 생성되지 않고 자기 자신을 팔로우할 수 없습니다.

## 최근 활동 API

| Method | Path | 인증 | 설명 |
| --- | --- | --- | --- |
| GET | `/api/private/activity?limit={n}` | 필요 | 내 여행의 좋아요·댓글과 새 팔로워를 최신순으로 조회 |

최근 활동은 `FOLLOW`, `LIKE`, `COMMENT`로 구분하며, 차단 관계와 본인이 만든 반응은
제외합니다. 응답은 최대 24개이고 스튜디오에서는 최근 8개를 간결한 피드로 보여줍니다.

## 인증과 쓰기 API

브라우저는 Next.js의 `/api/auth/*`, `/api/private/*` BFF를 사용합니다. BFF가 원문
세션 토큰을 HttpOnly·SameSite=Lax 쿠키에 보관하고 Spring API에는 Bearer 헤더로
전달합니다. 모바일 앱은 아래 Spring 엔드포인트의 토큰을 OS 보안 저장소에 보관해
같은 쓰기 API를 사용할 수 있습니다.

| Method | Path | 설명 |
| --- | --- | --- |
| POST | `/api/auth/register` | 회원가입 후 DB 세션 발급 |
| POST | `/api/auth/login` | 로그인 후 DB 세션 발급 |
| GET | `/api/auth/me` | 현재 계정 DTO (`Authorization: Bearer ...`) |
| PATCH | `/api/auth/profile` | 공개 프로필 수정 |
| POST | `/api/auth/logout` | 현재 세션 즉시 폐기 |
| GET | `/api/private/travels` | 내 공개·비공개 여행 목록 |
| GET | `/api/private/travels/{id}` | 내 여행 상세 |
| POST | `/api/private/travels` | 여행·장소·사진 URL 생성 |
| PUT | `/api/private/travels/{id}` | 여행 aggregate 전체 수정 |
| DELETE | `/api/private/travels/{id}` | 여행과 장소·사진 삭제 |
| GET | `/api/private/travels/{id}/tasks` | 내 여행 준비 체크리스트 조회 |
| POST | `/api/private/travels/{id}/tasks` | 준비 항목 추가 (최대 30개) |
| PATCH | `/api/private/travels/{id}/tasks/{taskId}` | 준비 항목 완료 상태 변경 |
| DELETE | `/api/private/travels/{id}/tasks/{taskId}` | 준비 항목 삭제 |
| GET | `/api/private/travels/{id}/planning` | 총예산·비용·예약을 합친 계획 보드 조회 |
| PATCH | `/api/private/travels/{id}/planning/budget` | 총예산과 통화 변경 |
| POST | `/api/private/travels/{id}/planning/expenses` | 비용 추가 (최대 50개) |
| PATCH | `/api/private/travels/{id}/planning/expenses/{expenseId}` | 비용·결제 상태 변경 |
| DELETE | `/api/private/travels/{id}/planning/expenses/{expenseId}` | 비용 삭제 |
| POST | `/api/private/travels/{id}/planning/reservations` | 날짜가 있는 예약 추가 (최대 50개) |
| PATCH | `/api/private/travels/{id}/planning/reservations/{reservationId}` | 예약·확정 상태 변경 |
| DELETE | `/api/private/travels/{id}/planning/reservations/{reservationId}` | 예약 삭제 |

미래 날짜의 비공개 여행 계획을 만들면 예약·서류·결제·짐 준비에 필요한 기본 항목
6개를 자동으로 생성합니다. 체크리스트는 여행 소유자만 조회하고 수정할 수 있습니다.

계획 보드는 총예산에서 등록한 비용을 빼 남은 금액을 계산하고, 비용의 결제 여부와
예약의 확정 여부를 각각 추적합니다. 통화는 `KRW`, `USD`, `JPY`, `EUR`를 지원하며
금액은 0 이상이어야 합니다. 예약 확인번호 같은 민감한 정보는 수집하지 않습니다.
계획 데이터도 여행 소유자만 접근할 수 있고, 다른 회원의 식별자를 사용하면 404를 반환합니다.
예약 이용 날짜는 여행 기간 안에 있어야 합니다. 공개 기록은 한국 시간 기준으로 여행 종료일이
된 뒤에만 저장할 수 있고, `장소를 골라주세요` 상태가 남은 자동 일정은 실제 장소로 바꿔야 합니다.
이 검사는 화면뿐 아니라 Spring 쓰기 API에도 적용되어 직접 요청으로 우회할 수 없습니다.

### Location picker support routes

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/maps/config` | Return the browser map provider and origin-restricted MapTiler key, or fallback mode |
| GET | `/api/locations/search?q={query}&country={iso2}` | Fallback search for up to five place candidates |
| GET | `/api/locations/reverse?lat={lat}&lng={lng}` | Fallback reverse geocode for a manually adjusted pin |

The primary MapTiler SDK requests go directly from the browser, provide Korean labels and
autocomplete, and persist only the location fields chosen by the user. If the key is absent or the
initial provider connection fails, search is submitted explicitly rather than called on every
keystroke. The fallback Next.js routes identify the application and serialize public Nominatim
requests to at most one per second per instance. Latitude/longitude remain outside the ordinary
form UI and are changed through the center-fixed map pin.

여행 CRUD는 `travel_id`만 보지 않고 인증된 `member_id`까지 같이 조회합니다. 다른
사용자의 비공개 여행 ID를 알아도 404만 반환합니다. 소셜 쓰기는 공개 여행에 한해
허용하고, 댓글 삭제 시 작성자 또는 여행 소유자 여부를 별도로 검증합니다.
