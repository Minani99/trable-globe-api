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
          <p className="eyebrow">Create your world</p>
          <h1>나만의 여행 지구본 만들기</h1>
          <p className="auth-card__intro">
            사용자명은 공개 프로필 주소가 됩니다. 이메일은 로그인에만 사용하고 공개하지 않습니다.
          </p>
          <AuthForm mode="register" nextPath={nextPath} />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
