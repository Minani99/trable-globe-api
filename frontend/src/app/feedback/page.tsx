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
      title="어디에서 불편했나요?"
      intro="화면이 멈추거나 버튼을 찾기 어려웠다면 알려주세요. 보내기를 누르면 작성한 내용이 운영자 이메일로 전달됩니다."
    >
      <section>
        <h2>오류 제보</h2>
        <BetaFeedbackForm />
      </section>
    </BetaInfoPage>
  );
}
