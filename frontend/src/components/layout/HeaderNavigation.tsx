"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";

import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { AccountNavigation } from "@/components/layout/AccountNavigation";
import {
  getCachedAuthMember,
  loadAuthMember,
  setCachedAuthMember,
  subscribeToAuthState,
} from "@/lib/auth-state";
import { globePath, profilePath, siteConfig } from "@/lib/config";
import type { AuthMember } from "@/types";

interface HeaderNavigationProps {
  username?: string;
  initialMember?: AuthMember | null;
}

export function HeaderNavigation({ username, initialMember }: HeaderNavigationProps) {
  const pathname = usePathname();
  const cachedMember = useSyncExternalStore(
    subscribeToAuthState,
    getCachedAuthMember,
    () => undefined,
  );
  const member = initialMember !== undefined ? initialMember : cachedMember;

  useEffect(() => {
    if (initialMember !== undefined) setCachedAuthMember(initialMember);
    else if (cachedMember === undefined) void loadAuthMember();
  }, [cachedMember, initialMember]);

  const samplePath = profilePath(siteConfig.demoUsername);
  const profileExact = Boolean(username && pathname === profilePath(username));
  const exploreActive =
    (pathname === samplePath || pathname.startsWith(`${samplePath}/`)) && !profileExact;
  const discoverActive = pathname === "/discover";

  return (
    <div className="site-header-actions">
      <nav aria-label="주요 메뉴" className="site-desktop-nav">
        <Link
          href={globePath}
          className="site-nav-link"
          aria-current={exploreActive ? "page" : undefined}
        >
          지구본
        </Link>
        <Link
          href="/discover"
          className="site-nav-link"
          aria-current={discoverActive ? "page" : undefined}
        >
          사람 찾기
        </Link>
        <AccountNavigation member={member} onLoggedOut={() => setCachedAuthMember(null)} />
      </nav>

      <ThemeToggle />
      <MobileBottomNavigation pathname={pathname} member={member} />
    </div>
  );
}

export function HeaderNavigationFallback() {
  return (
    <div className="site-header-actions">
      <nav aria-label="주요 메뉴" className="site-desktop-nav">
        <Link href={globePath} className="site-nav-link">지구본</Link>
        <Link href="/discover" className="site-nav-link">사람 찾기</Link>
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
  const createHref = member ? "/studio/travels/new" : "/register";
  const profileHref = member ? "/settings#profile" : "/login";
  const profileActive = member
    ? pathname === `/${member.username}` || pathname === "/settings"
    : pathname === "/login" || pathname === "/register";

  return (
    <nav className="site-mobile-bottom-nav" aria-label="모바일 주요 메뉴">
      <MobileNavLink href="/" label="홈" icon="home" active={pathname === "/"} />
      <MobileNavLink href={globePath} label="지구본" icon="globe" active={pathname === globePath} />
      <MobileNavLink
        href={createHref}
        label="기록"
        icon="add"
        active={pathname.startsWith("/studio")}
        emphasized
      />
      <MobileNavLink href="/discover" label="발견" icon="search" active={pathname === "/discover"} />
      <MobileNavLink href={profileHref} label="프로필" icon="profile" active={profileActive} />
    </nav>
  );
}

function MobileNavLink({
  href,
  label,
  icon,
  active,
  emphasized = false,
}: {
  href: string;
  label: string;
  icon: "home" | "globe" | "add" | "search" | "profile";
  active: boolean;
  emphasized?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`site-mobile-bottom-nav__item${emphasized ? " is-emphasized" : ""}`}
      aria-current={active ? "page" : undefined}
    >
      <MobileNavIcon name={icon} />
      <span>{label}</span>
    </Link>
  );
}

function MobileNavIcon({ name }: { name: "home" | "globe" | "add" | "search" | "profile" }) {
  if (name === "home") {
    return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="m4 10 8-6 8 6v9H8v-6h8v6" /></svg>;
  }
  if (name === "globe") {
    return <svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5" /><path d="M3.8 12h16.4M12 3.5c2.2 2.3 3.3 5.1 3.3 8.5S14.2 18.2 12 20.5M12 3.5C9.8 5.8 8.7 8.6 8.7 12s1.1 6.2 3.3 8.5" /></svg>;
  }
  if (name === "add") {
    return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 6v12M6 12h12" /></svg>;
  }
  if (name === "search") {
    return <svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m15.5 15.5 4 4" /></svg>;
  }
  return <svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="8.5" r="3.5" /><path d="M5.5 20c.7-4 2.9-6 6.5-6s5.8 2 6.5 6" /></svg>;
}
