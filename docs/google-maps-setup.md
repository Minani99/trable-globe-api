# Google 경로 지도 연결

키가 없으면 기존 Google Maps 외부 링크만 표시됩니다. 방문 순서 제안은 키 없이 동작하며 직선거리 기준입니다.

1. https://console.cloud.google.com/projectcreate 에서 `Travel Globe` 프로젝트를 만듭니다.
2. 프로젝트에 결제 계정을 연결합니다. 결제 정보 입력은 계정 소유자가 직접 진행합니다.
3. API 라이브러리에서 **Maps JavaScript API**와 **Routes API**를 활성화합니다.
4. 사용자 인증 정보에서 API 키를 만들고, 애플리케이션 제한을 **웹사이트(HTTP 리퍼러)**로 설정합니다.
   - `https://travel-globe-minani99.vercel.app/*`
   - 개발용은 별도 키를 권장하며 `http://localhost:3000/*`, `http://127.0.0.1:3000/*`를 허용합니다.
   - 임의의 `*.vercel.app` 전체를 허용하지 않습니다.
5. API 제한은 **Maps JavaScript API, Routes API** 두 개만 허용합니다.
6. Google Cloud에서 일일 요청 할당량과 결제 예산 알림을 설정합니다. 예산 알림 자체는 사용 요금을 차단하지 않습니다.
7. Vercel 프로젝트 → Settings → Environment Variables에 `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`를 등록하고 새 빌드를 배포합니다. 키를 채팅이나 Git에 넣지 않습니다.

이 키는 브라우저용 공개 키입니다. 웹사이트/API 제한이 필수이며 서버용 비밀 키를 여기에 넣으면 안 됩니다. 별도의 서버 키는 현재 구현에서 사용하지 않습니다.

## 확인

- 계획 또는 여행용 보기에서 `앱에서 경로·이동시간 보기`를 누릅니다.
- Google 지도 위에 실제 경로, 방문 번호, 총 이동시간 및 구간별 시간이 나타나는지 확인합니다.
- 위치가 모두 지정된 2~27곳의 도보·자동차 경로를 지원합니다. 대중교통은 두 장소 간 경로를 지원하고, 여러 장소는 기존 구간별 Google Maps 링크를 사용합니다.
- 날짜·장소·이동수단 변경 시 이전 결과를 제거합니다. 조회는 사용자가 지도를 연 경우에만 실행되며 결과를 서버나 로컬 저장소에 보관하지 않습니다.
- 키/결제/지원 지역 문제로 실패하면 외부 Google Maps 링크로 확인할 수 있습니다. 키 미설정 상태와 모의 응답 테스트는 실제 Google 계정 연동 검증을 대체하지 않습니다.

공식 문서: https://developers.google.com/maps/documentation/javascript/routes/start
키 제한: https://developers.google.com/maps/api-security-best-practices
