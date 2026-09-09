import type { Metadata } from "next";

import { BetaFeedbackForm } from "@/components/info/BetaFeedbackForm";
import { BetaInfoPage } from "@/components/info/BetaInfoPage";

export const metadata: Metadata = {
  title: "베타 의견 보내기",
  robots: { index: false, follow: false },
};

export default function FeedbackPage() {
  return (
    <BetaInfoPage
      eyebrow="Friends beta"
      title="낯설거나 멈춘 순간을 알려주세요."
      intro="버그뿐 아니라 버튼을 못 찾은 순간도 중요한 피드백입니다. 작성 내용은 서버에 저장되지 않으며 공유할 앱은 직접 선택합니다."
    >
      <section>
        <h2>30초 피드백</h2>
        <p>짧게 적고 초대받은 메신저로 바로 보내 주세요.</p>
        <BetaFeedbackForm />
      </section>
    </BetaInfoPage>
  );
}
