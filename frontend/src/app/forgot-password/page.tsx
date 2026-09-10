import type { Metadata } from "next";

import { ForgotPasswordForm } from "@/components/auth/AccountActionForms";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";

export const metadata: Metadata = { title: "비밀번호 찾기", robots: { index: false, follow: false } };

export default function ForgotPasswordPage() {
  return <><SiteHeader /><main id="main" className="auth-page flex-1"><section className="auth-card"><h1>비밀번호 재설정</h1><p className="auth-card__intro">가입한 이메일로 재설정 링크를 보내 드립니다.</p><ForgotPasswordForm /></section></main><SiteFooter /></>;
}
