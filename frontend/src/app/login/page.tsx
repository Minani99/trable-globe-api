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
        <section className="auth-card">
          <p className="eyebrow">Welcome back</p>
          <h1>내 여행으로 돌아가기</h1>
          <p className="auth-card__intro">다가오는 계획부터 다녀온 기록까지, 멈춘 곳에서 다시 이어보세요.</p>
          {reset === "1" ? <p className="auth-form__notice">새 비밀번호를 저장했습니다. 다시 로그인해 주세요.</p> : null}
          <AuthForm mode="login" nextPath={nextPath} />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
