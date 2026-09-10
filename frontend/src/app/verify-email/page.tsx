import type { Metadata } from "next";

import { VerifyEmailForm } from "@/components/auth/AccountActionForms";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";

export const metadata: Metadata = { title: "이메일 인증", robots: { index: false, follow: false } };

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  return <><SiteHeader /><main id="main" className="auth-page flex-1"><section className="auth-card"><h1>이메일 주소 확인</h1><p className="auth-card__intro">버튼을 누르면 인증이 완료됩니다.</p>{token ? <VerifyEmailForm token={token} /> : <p className="auth-form__error">인증 토큰이 없습니다. 내 기록에서 새 인증 메일을 요청해 주세요.</p>}</section></main><SiteFooter /></>;
}
