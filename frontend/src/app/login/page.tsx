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
          <h1>로그인</h1>
          <p className="auth-card__intro">여행 계획과 기록을 계속 관리하세요.</p>
          {reset === "1" ? <p className="auth-form__notice">새 비밀번호를 저장했습니다. 다시 로그인해 주세요.</p> : null}
          <AuthForm mode="login" nextPath={nextPath} />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
