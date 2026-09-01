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
          <h1>계정 만들기</h1>
          <p className="auth-card__intro">여행 계획과 기록을 한곳에서 관리합니다.</p>
          <AuthForm mode="register" nextPath={nextPath} />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
