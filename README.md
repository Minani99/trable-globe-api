# Travel Globe

내가 다녀온 나라를 3D 지구본 위에 기록하고, 다른 사람이 그 지구본을 직접 돌려보며
여행 기록을 탐색할 수 있는 개인 여행 아카이브입니다.

> **Travel Globe는 임시 서비스명입니다.** 브랜드 문자열은
> [`frontend/src/lib/config.ts`](frontend/src/lib/config.ts)의 `siteConfig` 한 곳에만 있으며,
> 이름이 확정되면 그 파일만 수정하면 됩니다.

---

## Vision

여행 블로그가 아니라 **Interactive Travel Identity**를 지향합니다.
목록을 읽기 전에 지구본이 먼저 "이 사람은 어디를 다녔는가"에 답하고,
장기적으로는 여러 사용자가 각자의 Travel Globe를 만들고 서로 구경하는
여행 SNS로 확장하는 것을 전제로 설계했습니다.

## Core Experience

이번 단계의 성공 기준은 아래 흐름이 끊기지 않는 것입니다.

```
프로필 진입  →  지구본 등장  →  방문 국가가 색과 마커로 구분됨
      →  국가 선택  →  카메라 이동 + 국가 패널
      →  해당 국가 여행 카드  →  여행 상세
```

## Tech Stack

| 영역 | 기술 | 비고 |
| --- | --- | --- |
| Backend | Java 21, Spring Boot 4.1.0, Spring MVC | 기존 프로젝트 설정 유지 |
| Persistence | Spring Data JPA, Hibernate 7.4, Flyway | PostgreSQL이 배포 대상 |
| Database | PostgreSQL 16+ (배포) / H2 in-memory (로컬 기본) | 아래 *PostgreSQL Setup* 참고 |
| Build | Maven (`mvnw`) | |
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4 | Turbopack 기본 |
| Globe | react-globe.gl (three.js / WebGL) | MIT, API 키 불필요 |
| Geo data | Natural Earth 110m (world-atlas) + world-countries | 빌드 시 생성, 런타임 외부 호출 없음 |

Spring Boot 4는 Jackson 3(`tools.jackson`)과 `spring-boot-starter-webmvc`를 사용합니다.
Spring Boot 3 기준 문서와 패키지 경로가 다른 부분이 있으니 주의하세요
(예: `@AutoConfigureMockMvc` → `org.springframework.boot.webmvc.test.autoconfigure`).

## Project Structure

Spring Boot 프로젝트가 이미 저장소 루트였기 때문에 **루트를 옮기지 않고**
`frontend/`와 `docs/`를 추가하는 구조를 선택했습니다.
(이유는 [docs/architecture.md](docs/architecture.md) 참고)

```
trable-globe-api/
├─ src/main/java/com/travelglobe/trableglobeapi/
│  ├─ global/        공통 설정, 응답 규격, 예외, BaseEntity, 시드 데이터
│  ├─ member/        Member 도메인
│  ├─ location/      Country / City 마스터 데이터
│  ├─ travel/        여행·일정·체크리스트·예산·예약 도메인과 조회·계획 API
│  ├─ social/        좋아요·댓글·최근 활동·회원 검색·추천·팔로우 및 권한 처리
│  ├─ statistics/    프로필 통계
│  └─ profile/       공개 프로필 읽기 파사드 (여러 도메인을 조합)
├─ src/main/resources/
│  ├─ application.yaml, application-{local,postgres,prod}.yaml
│  └─ db/migration/V1__...sql ~ V8__...sql
├─ frontend/
│  ├─ src/app/       /, /about, /[username], /[username]/travel/[travelId]
│  ├─ src/components/{layout,globe,profile,travel,common}
│  ├─ src/lib/{api,utils}, src/types
│  ├─ public/geo, public/placeholders   (생성된 정적 자산, 커밋됨)
│  └─ scripts/       geo·placeholder 생성 스크립트
├─ docs/
└─ README.md
```

## Backend Setup

**필요 조건: JDK 21** (`pom.xml`의 `java.version=21`)

이 PC에는 시스템 기본 JDK가 8이고 JDK 21은 별도 경로에 있습니다.
Travel Globe를 빌드할 때만 `JAVA_HOME`을 바꿔 쓰세요.

Windows PowerShell:

```bash
$env:JAVA_HOME="C:\Users\USER\.jdks\ms-21.0.8"; .\mvnw.cmd spring-boot:run
```

macOS / Linux:

```bash
JAVA_HOME=/path/to/jdk-21 ./mvnw spring-boot:run
```

기본 프로필은 `local`이며 **H2 in-memory**로 뜨기 때문에
PostgreSQL을 설치하지 않아도 즉시 실행됩니다.
서버는 <http://localhost:8080>, 시드 데이터(`@traveler`)가 자동으로 들어갑니다.

### 이 PC에서 확인된 Maven 문제

`C:\Users\USER\.m2\settings.xml`이 **0바이트 빈 파일**이라 Maven이 모든 빌드를 거부합니다.

```
[FATAL] Non-readable settings C:\Users\USER\.m2\settings.xml: input contained no data
```

프로젝트 문제가 아니라 이 PC의 전역 Maven 설정 문제이며,
이 저장소뿐 아니라 다른 Maven 프로젝트도 같이 막힙니다.
빈 파일이라 안에 보존할 내용은 없습니다. 둘 중 하나로 해결하세요.

```bash
del "%USERPROFILE%\.m2\settings.xml"
```

파일을 남겨두어야 한다면 유효한 최소 내용으로 바꾸거나, 매번 `-s`로 다른 파일을 지정하세요.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<settings xmlns="http://maven.apache.org/SETTINGS/1.0.0"/>
```

## Frontend Setup

**필요 조건: Node.js 20.9+** (Next.js 16 최소 버전, 현재 확인된 환경은 Node 24)

```bash
cd frontend && npm install && npm run dev
```

<http://localhost:3000> 접속 후 `/traveler`로 이동하거나 랜딩에서 "샘플 지구본 둘러보기"를 누르세요.

## Environment Variables

| 변수 | 사용처 | 기본값 | 필수 |
| --- | --- | --- | --- |
| `API_BASE_URL` | Frontend 서버·`/api` 프록시 | `http://localhost:8080` | 백엔드가 다른 호스트일 때 필수 |
| `SITE_URL` | Frontend 메타데이터·사이트맵 | Vercel URL 또는 `http://localhost:3000` | 커스텀 도메인 사용 시 권장 |
| `NEXT_PUBLIC_API_BASE_URL` | Frontend 브라우저 직접 호출(선택) | 동일 출처 `/api` 프록시 | 선택 |
| `NEXT_ALLOWED_DEV_ORIGINS` | Next.js 개발 서버 추가 Origin | 로컬 LAN IPv4 자동 감지 | 선택 |
| `DB_URL` | Backend (`postgres`, `prod`) | postgres 프로필은 localhost 기본값 | `prod` 필수 |
| `DB_USERNAME` | Backend | 동일 | `prod` 필수 |
| `DB_PASSWORD` | Backend | 동일 | `prod` 필수 |
| `CORS_ALLOWED_ORIGINS` | Backend (`prod`) | 없음 | `prod` 필수 |
| `SERVER_PORT` | Backend | `8080` | 선택 |

- 비밀번호와 키는 **어떤 yaml에도 하드코딩되어 있지 않습니다.** 모두 환경변수입니다.
- 프론트엔드는 기본적으로 동일 출처 `/api`를 백엔드로 프록시하므로 LAN의 다른 기기에서도
  그 기기의 `localhost`를 잘못 호출하지 않습니다. 백엔드 주소가 다를 때만 `API_BASE_URL`을 설정하세요.
- `frontend/.env.example`을 `frontend/.env.local`로 복사해서 쓰세요. `.env.local`은 git 제외 대상입니다.
- `prod` 프로필은 위 변수가 없으면 기동 단계에서 실패합니다(의도된 fail-fast).
- 공개 쇼케이스는 `demo` 프로필을 사용합니다. `prod` 설정을 모두 상속하면서 `traveler` 샘플만
  추가합니다. 실제 사용자 데이터 환경에서는 반드시 `prod`만 활성화하세요.

## PostgreSQL Setup

로컬 기본값이 H2인 이유와 PostgreSQL로 바꾸는 방법은 아래와 같습니다.

```sql
CREATE DATABASE travelglobe;
CREATE USER travelglobe WITH PASSWORD '<로컬 비밀번호>';
GRANT ALL PRIVILEGES ON DATABASE travelglobe TO travelglobe;
```

```bash
$env:JAVA_HOME="C:\Users\USER\.jdks\ms-21.0.8"; $env:DB_PASSWORD="<로컬 비밀번호>"; .\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=postgres"
```

`postgres` 프로필에서는 **Flyway가 스키마를 만들고**, Hibernate는 `ddl-auto=validate`로
엔티티와 실제 테이블이 어긋나면 기동을 거부합니다.

## Running Locally

터미널 두 개가 필요합니다.

```bash
$env:JAVA_HOME="C:\Users\USER\.jdks\ms-21.0.8"; .\mvnw.cmd spring-boot:run
```

```bash
cd frontend && npm run dev
```

동작 확인:

```bash
curl http://localhost:8080/api/health
```

## Deployment

무료 티어 기준 권장 구성은 **Vercel(Frontend) + Render(Backend) + Neon(PostgreSQL)** 입니다.
백엔드 컨테이너와 Render Blueprint는 저장소 루트의 `Dockerfile`, `render.yaml`에 있으며,
환경변수와 배포 순서는 [docs/deployment.md](docs/deployment.md)를 참고하세요.

Pull Request와 `master` push에는 GitHub Actions가 자동으로 백엔드 테스트와 프런트엔드
린트·타입 검사·프로덕션 빌드를 실행합니다.

## API

전체 명세는 [docs/api.md](docs/api.md)에 있습니다. 요약:

| Method | Path | 설명 |
| --- | --- | --- |
| GET | `/api/health` | 상태 확인 |
| GET | `/api/profiles/{username}` | 프로필 + 통계 |
| GET | `/api/profiles/{username}/statistics` | 통계 단독 |
| GET | `/api/profiles/{username}/countries` | 방문 국가 (지구본 마커) |
| GET | `/api/profiles/{username}/travels` | 여행 목록 |
| GET | `/api/profiles/{username}/countries/{code}/travels` | 국가별 여행 |
| GET | `/api/travels/{travelId}` | 여행 상세 |
| GET | `/api/travels/{travelId}/social` | 공개 좋아요·댓글 |
| GET/POST/DELETE | `/api/private/travels/{travelId}/...` | 내 여행 관리 및 좋아요·댓글 쓰기 |
| GET/POST/PATCH/DELETE | `/api/private/travels/{travelId}/tasks/...` | 여행 준비 체크리스트 관리 |
| GET/PATCH/POST/DELETE | `/api/private/travels/{travelId}/planning/...` | 총예산·비용·결제·예약 관리 |
| GET | `/api/private/activity` | 팔로우·좋아요·댓글 최근 활동 |
| GET | `/api/discovery/search` | 공개 프로필 검색 |
| GET | `/api/discovery/recommendations` | 활동 기반 여행자 추천 |
| GET/POST/DELETE | `/api/private/discovery/...` | 개인화 추천·검색 및 팔로우 관리 |

모든 응답은 `{ success, data, message }` 형태로 감싸며, 실패 시 `error.code`가 추가됩니다.

## Current Scope

**구현됨**

- 공개 프로필 조회와 소유자 전용 여행 CRUD API
- 회원가입·로그인·이메일 인증·비밀번호 재설정·회원 탈퇴, DB 기반 불투명 세션
- Flyway 마이그레이션 8개, 4개 실행 프로필 (`local`, `postgres`, `prod`, `demo`)
- 미래 여행을 위한 기본 준비 체크리스트, 사용자 항목 추가·완료·삭제와 진행률 표시
- 날짜별 일정 탭, 관광·식사·카페·숙소 빠른 추가, 전날 일정 복사와 미완성 계획 공개 방지
- 총예산과 통화, 예상·결제 비용, 날짜별 예약과 확정 상태를 한 화면에서 관리하는 계획 보드
- 팔로우·좋아요·댓글을 한곳에서 확인하는 로그인 사용자용 최근 활동 피드
- 3D 지구본: 회전 / 확대·축소 / 방문 국가 강조 / 마커 / hover / click / 카메라 이동 / 국가 패널
- 여행 날짜 재생·시점 슬라이더, 시점별 국가 성장 표현, 최근 여행 강조와 전체 방문 장소 이동선
- 연도별 지구본·이동선·기록 필터, 정확한 연결 거리·사진 중심 리캡과 연도 공유 링크
- 사용자·연도·여행 통계를 반영하는 전용 Open Graph/Twitter 공유 이미지
- 리캡 PNG 직접 저장·파일 공유, 월별 여행 리듬과 대표 도시 회고
- 직전 기록 연도 대비 여행·나라·일수·거리 변화와 새로 더해진 나라 비교
- 국가 선택에 따른 여행 카드 필터, 여행 타임라인, 여행 상세(경로 지도·장소·사진·이전/다음)
- Loading / Error / Not Found / Empty 상태
- 키보드 조작과 국가 목록 대체 UI, `prefers-reduced-motion` 대응
- 반응형 (모바일 / 태블릿 / 데스크톱)
- 지도 검색·지도 클릭 기반 장소 선택, 작성 자동 저장·복구와 장소 순서 편집
- 프로필·계정 전용 설정 화면, 프로필 사진 업로드·미리보기·교체·삭제
- 공개 여행 좋아요·댓글, 작성자·여행 소유자 댓글 삭제 권한
- 이름·사용자명 검색, 공통 방문 국가 기반 추천, 팔로우·팔로워 수
- 헤더와 내 프로필 카드에서 프로필 편집으로 바로 이어지는 계정 동선
- 지구본 조작 종료 6초 뒤 자동 회전 재개 (`prefers-reduced-motion` 예외)
- Cloudflare R2 직접 사진 업로드, 대표 사진·순서·장소 연결·삭제
- DB readiness/liveness, 요청 추적 번호, 느린 요청 로그, 인증 데이터 자동 정리
- Open Graph 공유 이미지, robots, sitemap, GitHub Actions CI

**의도적으로 만들지 않음**

OAuth, DM, 알림, 결제, 관리자, 연락처 업로드, 실시간 위치 기반 추천,
Redis, Kafka, MSA. 위치 권한 없이 공통 여행지와 공개 활동만으로 사람을 추천합니다.

## Future Roadmap

1. 전용 운영 DB·메일·R2·Vercel Firewall 연결과 복구 리허설
2. 5~10명 비공개 베타에서 모바일 작성·사진 업로드·공개 전환 검증
3. 사진 리사이즈와 EXIF 기반 날짜·장소 제안
4. 비공개 베타 결과에 따라 리캡 회고 문장·대표 장면 직접 편집 범위 결정
5. 베타 결과에 따라 앱(PWA/네이티브)과 소셜 기능 범위 결정

구현 순서와 완료 기준은 [docs/next-phase.md](docs/next-phase.md), 베타 진행은
[docs/beta-checklist.md](docs/beta-checklist.md), 화면 문구와 서체 원칙은
[docs/editorial-guide.md](docs/editorial-guide.md)에 정리했습니다.

## Architecture Decisions

주요 결정과 근거는 [docs/architecture.md](docs/architecture.md)에 정리했습니다. 요약:

1. **저장소 루트를 옮기지 않음** — Spring Boot 프로젝트가 이미 루트였고, git 히스토리
   보존을 우선했습니다. `frontend/`, `docs/`를 하위에 추가했습니다.
2. **패키지명 유지** — `com.travelglobe.trableglobeapi`를 그대로 두고 도메인별
   하위 패키지를 추가했습니다. 전체 rename은 되돌리기 어려운 변경이라 하지 않았습니다.
3. **로컬 기본 DB는 H2, 배포 대상은 PostgreSQL** — "설치 없이 바로 실행"과
   "운영은 PostgreSQL"을 동시에 만족시키기 위한 절충입니다. 스키마의 정답은
   Flyway 마이그레이션이고, `postgres`/`prod`에서 `validate`로 검증합니다.
4. **`profile` 패키지 추가** — 프로필 화면은 member·travel·location·statistics를
   모두 읽습니다. 특정 도메인이 다른 도메인을 침범하는 대신 조합 전용 읽기 파사드를 두었습니다.
5. **지구본은 react-globe.gl** — MIT, API 키 불필요, three.js 기반 실제 WebGL 지구본.
   국가 경계는 빌드 시 생성해 `public/`에 커밋하므로 런타임 외부 의존이 없습니다.
6. **전역 상태 라이브러리 없음** — 공유 상태가 "선택된 국가" 하나뿐이라
   React state로 충분합니다.
