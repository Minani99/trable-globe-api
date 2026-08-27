import type { Metadata } from "next";
import Link from "next/link";

import { BetaInfoPage } from "@/components/info/BetaInfoPage";

export const metadata: Metadata = {
  title: "베타 이용 안내",
  description: "Travel Globe 지인 베타의 범위와 안전한 사용 방법을 안내합니다.",
};

export default function TermsPage() {
  return (
    <BetaInfoPage
      eyebrow="Friends beta · 2026.08.27"
      title="완성된 서비스가 아니라, 함께 다듬는 여행 베타입니다."
      intro="지금은 초대받은 지인이 계획에서 기록까지의 흐름을 시험하는 단계입니다. 중요한 원본은 별도로 보관하고, 낯선 부분은 편하게 알려주세요."
    >
      <section>
        <h2>베타에서 가능한 것</h2>
        <p>여행 계획 작성, 장소 검색과 일정 정리, 준비 체크·예산·예약 메모, 여행 기록과 사진, 나만의 지구본, 공개 프로필과 친구 교류를 시험할 수 있습니다. 항공권·숙박을 판매하거나 예약을 대신하는 서비스는 아닙니다.</p>
      </section>
      <section>
        <h2>안전하게 사용해 주세요.</h2>
        <ul>
          <li>여권, 신분증, 결제정보, 상세 숙소 주소와 예약번호를 올리지 않습니다.</li>
          <li>다른 사람의 얼굴이나 정보가 담긴 사진은 당사자의 허락을 받고 올립니다.</li>
          <li>본인이 권리를 가진 글과 사진만 게시하고, 불쾌한 사용자는 차단·신고합니다.</li>
          <li>공개한 여행은 링크를 아는 사람과 다른 사용자에게 보일 수 있음을 확인합니다.</li>
        </ul>
      </section>
      <section>
        <h2>베타의 한계</h2>
        <p>기능과 화면은 예고 없이 바뀔 수 있고 일시적인 오류나 데이터 손실 가능성이 있습니다. 항공·날씨·장소 정보는 참고용이며 실제 운영기관과 예약처 정보를 다시 확인해야 합니다. 중요한 일정, 영수증과 사진 원본은 별도로 보관해 주세요.</p>
      </section>
      <section>
        <h2>콘텐츠와 계정</h2>
        <p>사용자가 올린 콘텐츠의 권리는 사용자에게 있습니다. 서비스는 해당 콘텐츠를 저장하고 선택한 공개 범위에 맞게 표시하는 데 사용합니다. 안전을 해치거나 타인의 권리를 침해한 콘텐츠는 베타 운영 중 숨김 또는 삭제될 수 있습니다. 설정에서 언제든 계정을 삭제할 수 있습니다.</p>
      </section>
      <aside className="beta-info__notice">
        <strong>문제가 생겼다면</strong>
        <p>오류 화면의 요청 번호와 하려던 일을 <Link href="/feedback">베타 의견 양식</Link>에 적어 초대한 운영자에게 보내 주세요. 비밀번호나 인증번호는 보내지 않습니다.</p>
      </aside>
    </BetaInfoPage>
  );
}
