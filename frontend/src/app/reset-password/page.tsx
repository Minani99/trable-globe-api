import type { Metadata } from "next";

import { ResetPasswordForm } from "@/components/auth/AccountActionForms";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";

export const metadata: Metadata = { title: "새 비밀번호 설정", robots: { index: false, follow: false } };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  return <><SiteHeader /><main id="main" className="auth-page flex-1"><section className="auth-card"><h1>새 비밀번호 설정</h1><p className="auth-card__intro">저장하면 다른 기기의 로그인도 종료됩니다.</p>{token ? <ResetPasswordForm token={token} /> : <p className="auth-form__error">재설정 토큰이 없습니다. 새 링크를 요청해 주세요.</p>}</section></main><SiteFooter /></>;
}
