import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth/AuthForm";
import { AuthScene } from "@/components/auth/AuthScene";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { getCurrentMember } from "@/lib/api/server-session";

export const metadata: Metadata = { title: "계정 만들기" };

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const [{ next }, member] = await Promise.all([
    searchParams,
    getCurrentMember().catch(() => null),
  ]);
  const nextPath =
    next?.startsWith("/") && !next.startsWith("//") && !next.includes("\\") ? next : undefined;
  if (member) redirect(nextPath ?? "/studio");
  return (
    <>
      <SiteHeader />
      <main id="main" className="auth-page auth-page--journal flex-1">
        <div className="auth-layout">
        <AuthScene />
        <section className="auth-card auth-card--wide auth-card--register">
          <p className="page-caption">첫 페이지를 펼쳐보세요</p>
          <h1>계정 만들기</h1>
          <p className="auth-card__intro">여행 계획과 기록을 한곳에서 관리합니다.</p>
          <AuthForm mode="register" nextPath={nextPath} />
        </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
