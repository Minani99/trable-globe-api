"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";

import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { AccountNavigation } from "@/components/layout/AccountNavigation";
import { MobileJourneyCapture } from "@/components/layout/MobileJourneyCapture";
import { TravelImage } from "@/components/common/TravelImage";
import {
  getCachedAuthMember,
  loadAuthMember,
  setCachedAuthMember,
  subscribeToAuthState,
} from "@/lib/auth-state";
import { globePath } from "@/lib/config";
import type { AuthMember } from "@/types";

interface HeaderNavigationProps {
  username?: string;
  initialMember?: AuthMember | null;
}

export function HeaderNavigation({ initialMember }: HeaderNavigationProps) {
  const pathname = usePathname();
  const cachedMember = useSyncExternalStore(
    subscribeToAuthState,
    getCachedAuthMember,
    () => undefined,
  );
  // Once the client cache has a value it is the freshest source. In particular,
  // logout writes `null` immediately; preferring the server prop would keep the
  // old avatar visible until a full page reload completed.
  const member = cachedMember !== undefined ? cachedMember : initialMember;

  useEffect(() => {
    if (initialMember !== undefined) setCachedAuthMember(initialMember);
  }, [initialMember]);

  useEffect(() => {
    if (initialMember === undefined && cachedMember === undefined) void loadAuthMember();
  }, [cachedMember, initialMember]);

  const globeActive = pathname === globePath;
  const discoverActive = pathname === "/discover";
  const journeysActive = pathname === "/studio" || pathname.startsWith("/studio/travels");
  const planActive = pathname.startsWith("/studio/plans");
  const aboutActive = pathname === "/about";

  return (
    <div className="site-header-actions">
      <nav aria-label="주요 메뉴" className="site-desktop-nav">
        {member ? (
          <>
            <Link href={globePath} className="site-nav-link site-nav-link--globe" aria-current={globeActive ? "page" : undefined}>
              내 지구본
            </Link>
            <Link href="/studio" className="site-nav-link" aria-current={journeysActive ? "page" : undefined}>
              여행
            </Link>
            <Link href="/studio/plans/new" className="site-nav-link" aria-current={planActive ? "page" : undefined}>
              계획
            </Link>
            <Link href="/discover" className="site-nav-link" aria-current={discoverActive ? "page" : undefined}>
              둘러보기
            </Link>
          </>
        ) : (
          <>
            <Link href="/discover" className="site-nav-link" aria-current={discoverActive ? "page" : undefined}>
              둘러보기
            </Link>
            <Link href="/about" className="site-nav-link" aria-current={aboutActive ? "page" : undefined}>
              서비스 소개
            </Link>
          </>
        )}
        <AccountNavigation member={member} onLoggedOut={() => setCachedAuthMember(null)} />
      </nav>

      <ThemeToggle />
      <MobileJourneyCapture key={pathname} pathname={pathname} member={member} />
      <MobileBottomNavigation pathname={pathname} member={member} />
    </div>
  );
}

export function HeaderNavigationFallback() {
  return (
    <div className="site-header-actions">
      <nav aria-label="주요 메뉴" className="site-desktop-nav">
        <Link href="/discover" className="site-nav-link">둘러보기</Link>
        <Link href="/about" className="site-nav-link">서비스 소개</Link>
        <span className="site-account-loading" aria-label="계정 정보 불러오는 중" />
      </nav>
      <ThemeToggle />
      <MobileBottomNavigation pathname="" member={undefined} />
    </div>
  );
}

function MobileBottomNavigation({
  pathname,
  member,
}: {
  pathname: string;
  member: AuthMember | null | undefined;
}) {
  const journeyHref = member ? "/studio" : "/login?next=%2Fstudio";
  const planHref = member ? "/studio/plans/new" : "/register?next=%2Fstudio%2Fplans%2Fnew";
  const profileHref = member ? "/settings" : "/login";
  const globeActive = pathname === globePath;
  const profileActive = member
    ? pathname === "/settings"
    : pathname === "/login" || pathname === "/register";

  return (
    <nav className="site-mobile-bottom-nav" aria-label="모바일 주요 메뉴">
      <MobileNavLink href={globePath} label="세계" icon="globe" active={globeActive} emphasized />
      <MobileNavLink
        href={journeyHref}
        label="기록"
        icon="trip"
        active={pathname === "/studio" || pathname.startsWith("/studio/travels")}
      />
      <MobileNavLink href={planHref} label="계획" icon="plan" active={pathname.startsWith("/studio/plans")} />
      <MobileNavLink href="/discover" label="둘러보기" icon="search" active={pathname === "/discover"} />
      <MobileNavLink
        href={profileHref}
        label="마이"
        icon="profile"
        active={profileActive}
        avatar={member ? {
          src: member.profileImageUrl,
          fallbackLabel: member.username.slice(0, 2),
        } : undefined}
      />
    </nav>
  );
}

function MobileNavLink({
  href,
  label,
  icon,
  active,
  emphasized = false,
  avatar,
}: {
  href: string;
  label: string;
  icon: "globe" | "trip" | "plan" | "search" | "profile";
  active: boolean;
  emphasized?: boolean;
  avatar?: { src: string | null; fallbackLabel: string };
}) {
  return (
    <Link
      href={href}
      className={`site-mobile-bottom-nav__item${emphasized ? " is-emphasized" : ""}${avatar ? " has-avatar" : ""}`}
      aria-current={active ? "page" : undefined}
    >
      {avatar ? (
        <TravelImage
          src={avatar.src}
          alt=""
          fallbackLabel={avatar.fallbackLabel}
          className="site-mobile-bottom-nav__avatar"
        />
      ) : <MobileNavIcon name={icon} />}
      <span>{label}</span>
    </Link>
  );
}

function MobileNavIcon({ name }: { name: "globe" | "trip" | "plan" | "search" | "profile" }) {
  if (name === "globe") {
    return <svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5" /><path d="M3.8 12h16.4M12 3.5c2.2 2.3 3.3 5.1 3.3 8.5S14.2 18.2 12 20.5M12 3.5C9.8 5.8 8.7 8.6 8.7 12s1.1 6.2 3.3 8.5" /></svg>;
  }
  if (name === "trip") {
    return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M6.5 7.5h11A2.5 2.5 0 0 1 20 10v7.5H4V10a2.5 2.5 0 0 1 2.5-2.5Z" /><path d="M9 7.5V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1.5M4 12h16M8 17.5v1.5M16 17.5v1.5" /></svg>;
  }
  if (name === "plan") {
    return <svg aria-hidden="true" viewBox="0 0 24 24"><rect x="4" y="5.5" width="16" height="14" rx="2" /><path d="M8 3.5v4M16 3.5v4M4 10h16M8 14h3M8 17h6" /></svg>;
  }
  if (name === "search") {
    return <svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m15.5 15.5 4 4" /></svg>;
  }
  return <svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="8.5" r="3.5" /><path d="M5.5 20c.7-4 2.9-6 6.5-6s5.8 2 6.5 6" /></svg>;
}
