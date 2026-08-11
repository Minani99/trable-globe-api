# API Reference

Base URL: `http://localhost:8080` (개발) — 프론트엔드는 `NEXT_PUBLIC_API_BASE_URL`로 지정합니다.

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
  "data": { "status": "UP", "serverTime": "2026-08-11T01:27:18.962862800Z" },
  "message": null
}
```

---

## GET /api/profiles/{username}

프로필 기본 정보와 통계.

**200**

```json
{
  "success": true,
  "data": {
    "username": "traveler",
    "displayName": "Travel Globe",
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
      "displayName": "Travel Globe",
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

## 아직 없는 것

쓰기 API(POST/PUT/DELETE)는 이번 단계에 없습니다. 인증이 함께 들어와야
소유권 검사를 제대로 붙일 수 있기 때문에, 껍데기 엔드포인트도 열지 않았습니다.

조회 서비스는 `TravelQueryService`라는 이름으로 두어 `TravelCommandService`가
추가될 자리를 비워 두었습니다.
