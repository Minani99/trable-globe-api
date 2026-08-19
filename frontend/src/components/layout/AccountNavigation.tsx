"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { TravelImage } from "@/components/common/TravelImage";
import { apiMutation } from "@/lib/api/client";
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

  async function logout() {
    await apiMutation<null>("/api/auth/logout", "POST");
    onLoggedOut();
    onNavigate?.();
    router.push("/");
    router.refresh();
  }

  if (compact) {
    return (
      <Link
        href={member ? "/settings#profile" : "/register"}
        className={`site-mobile-auth-link${member ? " site-mobile-profile" : ""}`}
        onClick={onNavigate}
        aria-busy={member === undefined ? true : undefined}
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
  if (member === undefined) {
    return mobile ? (
      <Link href="/login" onClick={onNavigate} aria-busy="true">
        <span>로그인 · 시작하기</span><span aria-hidden="true">→</span>
      </Link>
    ) : (
      <div className="site-account-entry" aria-busy="true">
        <Link href="/login" className="site-account-login">로그인</Link>
        <Link href="/register" className="site-profile-link site-profile-link--accent">시작하기</Link>
      </div>
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
      <button type="button" className="site-mobile-menu__button" onClick={logout}><span>로그아웃</span><span aria-hidden="true">↗</span></button>
    </>
  ) : (
    <div className="site-account-nav">
      <Link href="/studio">기록 관리</Link>
      <Link href="/settings#profile" className="site-member-profile" aria-label="내 프로필 편집">
        <TravelImage
          src={member.profileImageUrl}
          alt=""
          fallbackLabel={member.username.slice(0, 2)}
          className="site-member-avatar"
        />
        <span>
          <strong>{member.displayName}</strong>
          <small>프로필 편집</small>
        </span>
      </Link>
      <button type="button" onClick={logout} aria-label="로그아웃" title="로그아웃">↗</button>
    </div>
  );
}
