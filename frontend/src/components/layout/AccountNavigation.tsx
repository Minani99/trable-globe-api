"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { showFeedback } from "@/components/common/AppFeedback";
import { TravelImage } from "@/components/common/TravelImage";
import { ApiError, apiMutation } from "@/lib/api/client";
import type { AuthMember } from "@/types";

export function AccountNavigation({
  member,
  mobile = false,
  compact = false,
  onNavigate,
  onLoggedOut,
}: {
  member: AuthMember | null | undefined;
  mobile?: boolean;
  compact?: boolean;
  onNavigate?: () => void;
  onLoggedOut: () => void;
}) {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutPending, setLogoutPending] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    function closeMenu(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("pointerdown", closeMenu);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeMenu);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [menuOpen]);

  async function logout() {
    if (logoutPending) return;
    setLogoutPending(true);
    try {
      await apiMutation<null>("/api/auth/logout", "POST");
      onLoggedOut();
      onNavigate?.();
      setMenuOpen(false);
      showFeedback("안전하게 로그아웃했습니다.", "success");
      router.replace("/");
      router.refresh();
    } catch (error) {
      showFeedback(error instanceof ApiError ? error.message : "로그아웃하지 못했습니다. 다시 시도해 주세요.", "error");
      setLogoutPending(false);
    }
  }

  if (member === undefined) {
    return mobile ? (
      <span className="site-account-loading is-mobile" aria-label="계정 정보 불러오는 중" />
    ) : compact ? (
      <span className="site-account-loading is-compact" aria-label="계정 정보 불러오는 중" />
    ) : (
      <span className="site-account-loading" aria-label="계정 정보 불러오는 중" />
    );
  }

  if (compact) {
    return (
      <Link
        href={member ? "/settings#profile" : "/register"}
        className={`site-mobile-auth-link${member ? " site-mobile-profile" : ""}`}
        onClick={onNavigate}
      >
        {member ? (
          <>
            <TravelImage
              src={member.profileImageUrl}
              alt="내 프로필 편집"
              fallbackLabel={member.username.slice(0, 2)}
              className="site-member-avatar"
            />
            <span>프로필</span>
          </>
        ) : "시작하기"}
      </Link>
    );
  }
  if (!member) {
    return mobile ? (
      <>
        <Link href="/register" onClick={onNavigate}><span>내 지구본 시작하기</span><span aria-hidden="true">→</span></Link>
        <Link href="/login" onClick={onNavigate}><span>로그인</span><span aria-hidden="true">→</span></Link>
      </>
    ) : (
      <div className="site-account-entry">
        <Link href="/login" className="site-account-login">로그인</Link>
        <Link href="/register" className="site-profile-link site-profile-link--accent">시작하기</Link>
      </div>
    );
  }
  return mobile ? (
    <>
      <Link href={`/${member.username}`} onClick={onNavigate}><span>내 공개 프로필</span><span aria-hidden="true">→</span></Link>
      <Link href="/studio" onClick={onNavigate}><span>내 여행 관리</span><span aria-hidden="true">→</span></Link>
      <Link href="/settings#profile" onClick={onNavigate}><span>프로필 편집</span><span aria-hidden="true">→</span></Link>
      <Link href="/settings#account" onClick={onNavigate}><span>계정 설정</span><span aria-hidden="true">→</span></Link>
      <button type="button" className="site-mobile-menu__button is-logout" onClick={logout} disabled={logoutPending}>
        <span>{logoutPending ? "로그아웃 중…" : "로그아웃"}</span><span aria-hidden="true">→</span>
      </button>
    </>
  ) : (
    <div className="site-account-nav" ref={menuRef}>
      <Link href="/studio">기록 관리</Link>
      <div className={`site-account-menu${menuOpen ? " is-open" : ""}`}>
        <Link href="/settings#profile" className="site-member-profile" aria-label="내 프로필 편집">
          <TravelImage
            src={member.profileImageUrl}
            alt=""
            fallbackLabel={member.username.slice(0, 2)}
            className="site-member-avatar"
          />
          <span>
            <strong>{member.displayName}</strong>
            <small>@{member.username}</small>
          </span>
        </Link>
        <button
          type="button"
          className="site-account-menu__toggle"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label="계정 메뉴 열기"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
        >
          <span aria-hidden="true">⌄</span>
        </button>
        {menuOpen ? (
          <div className="site-account-popover" role="menu">
            <div className="site-account-popover__identity">
              <strong>{member.displayName}</strong>
              <span>@{member.username}</span>
            </div>
            <Link href={`/${member.username}`} role="menuitem" onClick={() => setMenuOpen(false)}><span>내 공개 프로필</span><span aria-hidden="true">↗</span></Link>
            <Link href="/studio" role="menuitem" onClick={() => setMenuOpen(false)}><span>여행 기록 관리</span><span aria-hidden="true">→</span></Link>
            <Link href="/settings#profile" role="menuitem" onClick={() => setMenuOpen(false)}><span>프로필 편집</span><span aria-hidden="true">→</span></Link>
            <Link href="/settings#account" role="menuitem" onClick={() => setMenuOpen(false)}><span>계정 설정</span><span aria-hidden="true">→</span></Link>
            <button type="button" className="site-account-popover__logout" role="menuitem" onClick={logout} disabled={logoutPending}>
              <span>{logoutPending ? "로그아웃 중…" : "로그아웃"}</span>
              <span aria-hidden="true">→</span>
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
