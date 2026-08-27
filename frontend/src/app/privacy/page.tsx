import type { Metadata } from "next";

import { BetaInfoPage } from "@/components/info/BetaInfoPage";

export const metadata: Metadata = {
  title: "베타 개인정보 안내",
  description: "Travel Globe 지인 베타에서 다루는 데이터와 사용자의 선택을 안내합니다.",
};

export default function PrivacyPage() {
  return (
    <BetaInfoPage
      eyebrow="Beta data guide · 2026.08.27"
      title="내 여행 데이터가 어떻게 쓰이는지 먼저 알려드립니다."
      intro="이 문서는 소수 지인을 위한 비공개 베타의 데이터 안내입니다. 공개 출시 전 운영자 정보, 보관 기간과 국외 처리 내용을 확정한 정식 개인정보 처리방침으로 교체합니다."
    >
      <section>
        <h2>어떤 정보를 다루나요?</h2>
        <p>계정 생성을 위해 이메일, 사용자명, 보여질 이름과 암호화된 비밀번호 해시를 저장합니다. 사용자가 입력한 소개, 프로필 사진, 여행 계획·기록·장소·사진·메모, 팔로우와 신고 정보도 서비스 제공에 사용됩니다.</p>
      </section>
      <section>
        <h2>왜 사용하나요?</h2>
        <ul>
          <li>로그인과 계정 복구, 본인 여행 데이터 연결</li>
          <li>여행 계획 작성·저장, 기록과 지구본·프로필 표시</li>
          <li>공유, 친구 찾기, 차단·신고와 서비스 안전 유지</li>
          <li>오류 확인과 장애 대응을 위한 요청 경로·상태·처리 시간 기록</li>
        </ul>
      </section>
      <section>
        <h2>공개 범위는 내가 정합니다.</h2>
        <p>새 여행 계획은 비공개로 시작합니다. 사용자가 공개로 바꾼 여행 기록과 프로필 정보만 다른 사람에게 보입니다. 숙소 주소, 예약번호, 여권, 결제정보처럼 여행에 필요하지만 민감한 정보는 입력하거나 사진으로 올리지 마세요.</p>
      </section>
      <section>
        <h2>어디에서 처리되나요?</h2>
        <p>현재 베타는 Vercel(화면), Render(서버), Neon(데이터베이스), Cloudflare R2(사진), Resend(계정 이메일)를 사용합니다. 지도·장소·날씨 기능을 사용할 때 MapTiler, OpenStreetMap 관련 서비스와 Open-Meteo에 검색어 또는 위치·날짜가 전달될 수 있습니다.</p>
      </section>
      <section>
        <h2>내 정보는 어떻게 관리하나요?</h2>
        <p>설정에서 프로필과 공개 범위를 바꾸고 계정을 삭제할 수 있습니다. 계정 삭제가 완료되면 계정·여행 데이터와 서비스 저장소에 올린 사진 삭제를 시도합니다. 운영 백업에는 제공업체의 보존 기간 동안 제한적으로 남을 수 있습니다. 베타 관련 요청은 이 사이트를 초대한 운영자에게 전달해 주세요.</p>
      </section>
      <aside className="beta-info__notice">
        <strong>공개 출시 전 필수 보완</strong>
        <p>운영자 실명·연락처, 개인정보 보호 책임자, 제공업체별 국외 이전 국가·시점·보관 기간을 확정하고 정식 처리방침과 변경 이력을 게시합니다.</p>
      </aside>
    </BetaInfoPage>
  );
}
