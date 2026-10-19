import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Icon } from "@/components/common/Icon";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { AccountDeletion } from "@/components/studio/AccountDeletion";
import { AccountOverview } from "@/components/studio/AccountOverview";
import { AccountSectionNav } from "@/components/studio/AccountSectionNav";
import { AccountSettings } from "@/components/studio/AccountSettings";
import { PasswordSettings } from "@/components/studio/PasswordSettings";
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
      <main id="main" className="studio-page settings-page account-page flex-1">
        <div className="site-shell studio-shell settings-shell account-shell">
          <nav aria-label="현재 위치" className="studio-breadcrumb">
            <Link href="/studio">여행 관리</Link><Icon name="chevron-right" /><span>내 정보</span>
          </nav>
          <AccountOverview member={member} />
          <div className="account-workspace">
            <AccountSectionNav />
            <div className="account-sections">
              <ProfileEditor member={member} />
              <AccountSettings member={member} />
              <PasswordSettings />
              <AccountDeletion member={member} />
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
