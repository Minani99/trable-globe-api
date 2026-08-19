import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { AccountSettings } from "@/components/studio/AccountSettings";
import { ProfileEditor } from "@/components/studio/ProfileEditor";
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
        <div className="site-shell studio-shell">
          <nav aria-label="현재 위치" className="studio-breadcrumb">
            <Link href="/studio">← 내 여행 관리</Link>
          </nav>
          <header className="studio-hero settings-hero">
            <div>
              <p className="eyebrow">Settings · @{member.username}</p>
              <h1>나를 보여주는 방식과<br />계정을 관리하세요</h1>
            </div>
            <Link href={`/${member.username}`} className="studio-secondary-action">공개 프로필 보기 ↗</Link>
          </header>
          <div className="settings-layout">
            <ProfileEditor member={member} />
            <AccountSettings member={member} />
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
