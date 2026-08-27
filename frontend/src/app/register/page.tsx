import type { Metadata } from "next";

import { AuthForm } from "@/components/auth/AuthForm";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";

export const metadata: Metadata = { title: "계정 만들기" };

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const nextPath =
    next?.startsWith("/") && !next.startsWith("//") && !next.includes("\\") ? next : undefined;
  return (
    <>
      <SiteHeader />
      <main id="main" className="auth-page flex-1">
        <section className="auth-card auth-card--wide auth-card--register">
          <p className="eyebrow">Plan · Travel · Remember</p>
          <h1>한 번 계획하고, 그대로 기록하세요</h1>
          <p className="auth-card__intro">
            나라와 날짜를 고르면 여행의 뼈대가 만들어집니다. 여행 중에는 체크하고,
            다녀온 뒤에는 같은 일정을 다시 쓰지 않아도 됩니다.
          </p>
          <RegisterJourneyPreview />
          <AuthForm mode="register" nextPath={nextPath} />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

function RegisterJourneyPreview() {
  return (
    <div className="auth-journey" aria-label="Travel Globe 이용 흐름">
      <div className="auth-journey__visual" aria-hidden="true">
        <span className="auth-journey__globe">
          <i className="auth-journey__land auth-journey__land--one" />
          <i className="auth-journey__land auth-journey__land--two" />
          <i className="auth-journey__pin" />
        </span>
        <span className="auth-journey__route" />
        <span className="auth-journey__ticket">
          <small>YOUR NEXT WORLD</small>
          <strong>첫 계획 · 약 3분</strong>
        </span>
      </div>

      <ol className="auth-journey__steps">
        <li><span>01</span><div><strong>계획</strong><small>나라와 날짜를 선택해요</small></div></li>
        <li><span>02</span><div><strong>여행</strong><small>오늘 일정을 가볍게 체크해요</small></div></li>
        <li><span>03</span><div><strong>기록</strong><small>사진과 동선을 지구본에 남겨요</small></div></li>
      </ol>

      <p className="auth-journey__privacy"><span aria-hidden="true">✓</span> 계획은 기본 비공개 · 공개 시점은 직접 선택</p>
    </div>
  );
}
