import type { Metadata } from "next";

import { AuthForm } from "@/components/auth/AuthForm";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";

export const metadata: Metadata = { title: "로그인" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ reset?: string; next?: string }> }) {
  const { reset, next } = await searchParams;
  const nextPath =
    next?.startsWith("/") && !next.startsWith("//") && !next.includes("\\") ? next : undefined;
  return (
    <>
      <SiteHeader />
      <main id="main" className="auth-page flex-1">
        <section className="auth-card auth-card--login">
          <p className="eyebrow">Welcome back</p>
          <h1>내 여행으로 돌아가기</h1>
          <p className="auth-card__intro">다가오는 계획부터 다녀온 기록까지, 멈춘 곳에서 다시 이어보세요.</p>
          <LoginReturnPreview />
          {reset === "1" ? <p className="auth-form__notice">새 비밀번호를 저장했습니다. 다시 로그인해 주세요.</p> : null}
          <AuthForm mode="login" nextPath={nextPath} />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

function LoginReturnPreview() {
  return (
    <div className="auth-return" aria-label="로그인 후 이어지는 나의 여행 공간">
      <div className="auth-return__card" aria-hidden="true">
        <header>
          <span><i /> MY TRAVEL SPACE</span>
          <small>자동 저장</small>
        </header>
        <div className="auth-return__continue">
          <span className="auth-return__marker">↗</span>
          <span>
            <small>최근 작업부터</small>
            <strong>멈춘 여행을 그대로 이어서</strong>
          </span>
          <b>→</b>
        </div>
        <div className="auth-return__track"><i /><i /><i /></div>
      </div>

      <ul className="auth-return__features">
        <li><span>01</span><div><strong>계획 이어쓰기</strong><small>일정과 장소가 그대로</small></div></li>
        <li><span>02</span><div><strong>여행 기록하기</strong><small>계획을 기록으로 전환</small></div></li>
        <li><span>03</span><div><strong>나의 지구본</strong><small>다녀온 세계를 한눈에</small></div></li>
      </ul>

      <p className="auth-return__privacy"><span aria-hidden="true">✓</span> 내 계획과 기록은 로그인한 나에게 먼저 보여요</p>
    </div>
  );
}
