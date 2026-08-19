"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { AccountNavigation } from "@/components/layout/AccountNavigation";
import { globePath, profilePath, siteConfig } from "@/lib/config";
import type { AuthMember } from "@/types";

interface HeaderNavigationProps {
  username?: string;
}

export function HeaderNavigation({ username }: HeaderNavigationProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [member, setMember] = useState<AuthMember | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/me", { headers: { Accept: "application/json" }, cache: "no-store" })
      .then(async (response) => {
        if (!active) return;
        if (!response.ok) {
          setMember(null);
          return;
        }
        const body = (await response.json()) as { data?: AuthMember };
        setMember(body.data ?? null);
      })
      .catch(() => active && setMember(null));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [menuOpen]);

  const samplePath = profilePath(siteConfig.demoUsername);
  const profileExact = Boolean(username && pathname === profilePath(username));
  const exploreActive =
    (pathname === samplePath || pathname.startsWith(`${samplePath}/`)) && !profileExact;
  const aboutActive = pathname === "/about";

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
          href="/about"
          className="site-nav-link"
          aria-current={aboutActive ? "page" : undefined}
        >
          서비스 소개
        </Link>
        {username ? (
          <Link
            href={profilePath(username)}
            className="site-profile-link"
            aria-current={profileExact ? "page" : undefined}
          >
            @{username}
          </Link>
        ) : null}
        <AccountNavigation member={member} onLoggedOut={() => setMember(null)} />
      </nav>

      <ThemeToggle />

      <div className="site-mobile-account">
        <AccountNavigation member={member} compact onLoggedOut={() => setMember(null)} />
      </div>

      <button
        type="button"
        className={`site-menu-toggle${menuOpen ? " is-open" : ""}`}
        aria-label={menuOpen ? "메뉴 닫기" : "메뉴 열기"}
        aria-expanded={menuOpen}
        aria-controls="mobile-site-menu"
        onClick={() => setMenuOpen((open) => !open)}
      >
        <span aria-hidden="true" />
        <span aria-hidden="true" />
      </button>

      <nav
        id="mobile-site-menu"
        aria-label="모바일 메뉴"
        className={`site-mobile-menu${menuOpen ? " is-open" : ""}`}
      >
        <Link
          href={globePath}
          aria-current={exploreActive ? "page" : undefined}
          onClick={() => setMenuOpen(false)}
        >
          <span>여행 지구본 보기</span>
          <span aria-hidden="true">↗</span>
        </Link>
        <Link
          href="/about"
          aria-current={aboutActive ? "page" : undefined}
          onClick={() => setMenuOpen(false)}
        >
          <span>서비스 소개</span>
          <span aria-hidden="true">↗</span>
        </Link>
        {username ? (
          <Link
            href={profilePath(username)}
            aria-current={profileExact ? "page" : undefined}
            onClick={() => setMenuOpen(false)}
          >
            <span>@{username}의 지구본</span>
            <span aria-hidden="true">→</span>
          </Link>
        ) : null}
        <AccountNavigation
          member={member}
          mobile
          onNavigate={() => setMenuOpen(false)}
          onLoggedOut={() => setMember(null)}
        />
      </nav>
    </div>
  );
}

export function HeaderNavigationFallback() {
  return (
    <div className="site-header-actions">
      <nav aria-label="주요 메뉴" className="site-desktop-nav">
        <Link href={globePath} className="site-nav-link">지구본</Link>
        <Link href="/about" className="site-nav-link">서비스 소개</Link>
        <Link href="/login" className="site-account-login">로그인</Link>
        <Link href="/register" className="site-profile-link site-profile-link--accent">시작하기</Link>
      </nav>
      <ThemeToggle />
      <div className="site-mobile-account">
        <Link href="/register" className="site-mobile-auth-link">시작하기</Link>
      </div>
    </div>
  );
}
