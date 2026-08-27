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
      intro="버그뿐 아니라 버튼을 못 찾은 순간, 글이 이해되지 않은 순간도 가장 중요한 피드백입니다. 작성 내용은 서버로 전송되지 않고 이 기기에서 복사됩니다."
    >
      <section>
        <h2>30초 피드백</h2>
        <p>아래 내용을 채운 뒤 복사해서 초대받은 메신저에 보내 주세요.</p>
        <BetaFeedbackForm />
      </section>
    </BetaInfoPage>
  );
}
