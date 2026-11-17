import Link from "next/link";

import { globePath } from "@/lib/config";

/**
 * The page used to end on a quiet "browse" link. A closing band restates the promise and
 * gives one clear next step. Plain links, so it adds no client JavaScript: a guest who
 * opens the planner is sent through sign-in and returned to it.
 */
export function LandingClosing() {
  return (
    <section className="landing-closing" aria-labelledby="landing-closing-title">
      <div className="site-shell landing-closing__inner">
        <div>
          <p className="landing-closing__eyebrow">지금 시작하기</p>
          <h2 id="landing-closing-title">다음 여행부터<br />지구본에 남겨 보세요.</h2>
          <p className="landing-closing__copy">일정을 짜고, 다녀온 뒤에는 사진과 메모로 기록하세요. 내 지구본은 여행할수록 채워집니다.</p>
        </div>
        <div className="landing-closing__actions">
          <Link href="/studio/plans/new" className="landing-closing__primary">첫 여행 계획 만들기</Link>
          <Link href={globePath} className="landing-closing__secondary">샘플 지구본 보기</Link>
        </div>
      </div>
    </section>
  );
}
