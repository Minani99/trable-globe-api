# Google 지도 연결

키를 등록하면 앱 안의 지도가 Google 지도로 바뀝니다.

- 여행 상세·공유 화면과 여행용 보기의 일정 지도: 방문 순서 번호 마커, 핀치·드래그 확대/이동
  (모바일의 작은 지도는 한 손가락은 화면 스크롤, 두 손가락은 지도 이동)
- 장소의 `위치 조정` 지도: 한 손가락으로 움직여 가운데 핀에 맞춤
- `앱에서 경로·이동시간 보기`: 실제 경로와 이동시간

키가 없거나 Google이 키를 거부하면(리퍼러 제한, 결제 미연결, API 미활성 등) 같은 화면이 기본 지도
(OpenStreetMap/MapTiler)로 자동 전환되고, 경로는 Google Maps 외부 링크로 확인합니다.
방문 순서 제안은 키 없이 동작하며 직선거리 기준입니다.

장소 **검색**은 Google Places가 아니라 기존 검색(OpenStreetMap/MapTiler)을 계속 사용합니다.
Places API 결과의 위도·경도는 최대 30일까지만 저장할 수 있는데
([Service Specific Terms](https://cloud.google.com/maps-platform/terms/maps-service-terms)),
여행 기록은 장소 좌표를 영구 저장하기 때문입니다. 그래서 Places API는 활성화하지 않습니다.

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

- 여행용 보기(`/studio/travels/{id}/go`)나 공개 여행 화면의 일정 지도가 Google 지도로 표시되고 번호 마커를 누르면 장소가 선택되는지 확인합니다.
- 장소 편집의 `위치 조정`을 열어 상단에 `Google 지도`가 표시되는지 확인합니다.
- 계획 또는 여행용 보기에서 `앱에서 경로·이동시간 보기`를 누릅니다.
- Google 지도 위에 실제 경로, 방문 번호, 총 이동시간 및 구간별 시간이 나타나는지 확인합니다.
- 위치가 모두 지정된 2~27곳의 도보·자동차 경로를 지원합니다. 대중교통은 두 장소 간 경로를 지원하고, 여러 장소는 기존 구간별 Google Maps 링크를 사용합니다.
- 날짜·장소·이동수단 변경 시 이전 결과를 제거합니다. 조회는 사용자가 지도를 연 경우에만 실행되며 결과를 서버나 로컬 저장소에 보관하지 않습니다.
- 키/결제/지원 지역 문제로 실패하면 외부 Google Maps 링크로 확인할 수 있습니다. 키 미설정 상태와 모의 응답 테스트는 실제 Google 계정 연동 검증을 대체하지 않습니다.

공식 문서: https://developers.google.com/maps/documentation/javascript/routes/start
키 제한: https://developers.google.com/maps/api-security-best-practices
