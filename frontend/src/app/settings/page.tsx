import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { AccountSettings } from "@/components/studio/AccountSettings";
import { PasswordSettings } from "@/components/studio/PasswordSettings";
import { ProfileEditor } from "@/components/studio/ProfileEditor";
import { SettingsSessionActions } from "@/components/studio/SettingsSessionActions";
import { getCurrentMember } from "@/lib/api/server-session";

export const metadata: Metadata = {
  title: "프로필 및 계정 설정",
  robots: { index: false, follow: false },
};

export default async function SettingsPage() {
  const member = await getCurrentMember();
  if (!member) redirect("/login?next=/settings");

  return (
    <>
      <SiteHeader username={member.username} member={member} />
      <main id="main" className="studio-page settings-page flex-1">
        <div className="site-shell studio-shell settings-shell">
          <nav aria-label="현재 위치" className="studio-breadcrumb">
            <Link href="/studio">여행 관리</Link><span aria-hidden="true">/</span><span>내 정보</span>
          </nav>
          <header className="studio-hero settings-hero">
            <div>
              <h1>내 정보</h1>
              <p>프로필과 로그인 정보를 관리합니다.</p>
            </div>
            <SettingsSessionActions member={member} />
          </header>
          <div className="settings-workspace">
            <nav className="settings-section-nav" aria-label="내 정보 항목">
              <a href="#profile">프로필</a>
              <a href="#account">로그인 정보</a>
              <a href="#security">비밀번호</a>
            </nav>
            <div className="settings-layout">
              <ProfileEditor member={member} />
              <AccountSettings member={member} />
              <PasswordSettings />
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
