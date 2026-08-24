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
        <section className="auth-card auth-card--wide">
          <p className="eyebrow">Start your journey</p>
          <h1>다음 여행부터 시작하기</h1>
          <p className="auth-card__intro">
            계획은 비공개로 시작하고, 다녀온 여행만 지구본과 프로필에 공개할 수 있습니다.
          </p>
          <AuthForm mode="register" nextPath={nextPath} />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
