"use client";

import { useSyncExternalStore } from "react";

import { Icon } from "@/components/common/Icon";
import { TravelImage } from "@/components/common/TravelImage";
import { SettingsSessionActions } from "@/components/studio/SettingsSessionActions";
import { getCachedAuthMember, subscribeToAuthState } from "@/lib/auth-state";
import { publicDisplayName } from "@/lib/utils/profile";
import type { AuthMember } from "@/types";

/** Page header that follows profile edits made further down the page. */
export function AccountOverview({ member }: { member: AuthMember }) {
  const cached = useSyncExternalStore(subscribeToAuthState, getCachedAuthMember, () => undefined);
  const current = cached ?? member;

  return (
    <header className="account-hero">
      <div className="account-hero__identity">
        <TravelImage
          src={current.profileImageUrl}
          alt={`${publicDisplayName(current.displayName)} 프로필 사진`}
          fallbackLabel={current.username.slice(0, 2)}
          className="account-hero__avatar"
        />
        <div>
          <h1>내 정보</h1>
          <p className="account-hero__name"><strong>{publicDisplayName(current.displayName)}</strong><span>@{current.username}</span></p>
          <p className="account-hero__email">
            <Icon name="mail" />
            <span>{current.email}</span>
            <b className={`account-chip ${current.emailVerified ? "is-success" : "is-warning"}`}>{current.emailVerified ? "인증됨" : "인증 필요"}</b>
          </p>
        </div>
      </div>
      <SettingsSessionActions member={current} />
    </header>
  );
}
