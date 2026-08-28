"use client";

import Link from "next/link";
import { useState } from "react";

import { TravelImage } from "@/components/common/TravelImage";
import { FollowButton } from "@/components/discovery/FollowButton";
import { ProfileConnections } from "@/components/profile/ProfileConnections";
import { ProfileSafetyActions } from "@/components/profile/ProfileSafetyActions";
import { formatStat } from "@/lib/utils/format";
import { publicDisplayName } from "@/lib/utils/profile";
import type { FollowStatus, MemberSafetyStatus, UserProfile } from "@/types";

interface ProfilePanelProps {
  profile: UserProfile;
  isOwnProfile: boolean;
  viewerAuthenticated: boolean;
  initialFollowing: boolean;
  initialSafetyStatus: MemberSafetyStatus | null;
  showIdentity?: boolean;
}

export function ProfilePanel({
  profile,
  isOwnProfile,
  viewerAuthenticated,
  initialFollowing,
  initialSafetyStatus,
  showIdentity = true,
}: ProfilePanelProps) {
  const { statistics } = profile;
  const [followerCount, setFollowerCount] = useState(profile.followerCount);
  const [following, setFollowing] = useState(initialFollowing);
  const [safetyStatus, setSafetyStatus] = useState(initialSafetyStatus);
  const displayName = publicDisplayName(profile.displayName);

  function updateFollowing(status: FollowStatus) {
    setFollowing(status.following);
    setFollowerCount(status.followerCount);
  }

  function updateSafety(status: MemberSafetyStatus) {
    if (status.interactionRestricted && following) {
      setFollowing(false);
      setFollowerCount((count) => Math.max(0, count - 1));
    }
    setSafetyStatus(status);
  }

  const identity = (
    <>
      <TravelImage
        src={profile.profileImageUrl}
        alt={`${displayName} 프로필 이미지`}
        fallbackLabel={profile.username.slice(0, 2)}
        className="border-border-subtle h-12 w-12 shrink-0 rounded-full border object-cover"
      />
      <span className="min-w-0 flex-1">
        <strong className="text-content block truncate text-[1.05rem] font-medium tracking-tight">
          {displayName}
        </strong>
        <small className="text-content-faint block truncate font-mono text-[0.76rem]">
          @{profile.username}
        </small>
      </span>
      <span className="profile-panel__identity-action">{isOwnProfile ? "편집" : "보기"}</span>
    </>
  );

  return (
    <section aria-label="프로필" className="panel w-full p-5 lg:w-[280px]">
      {showIdentity ? (
        isOwnProfile ? (
          <Link href="/settings#profile" className="profile-panel__identity" aria-label="내 프로필 편집">
            {identity}
          </Link>
        ) : (
          <div className="profile-panel__identity">{identity}</div>
        )
      ) : null}

      {profile.bio ? (
        <p className={`text-body text-[0.85rem] leading-relaxed${showIdentity ? " mt-4" : ""}`}>{profile.bio}</p>
      ) : null}

      <dl className={`border-border-subtle grid grid-cols-3 gap-2${showIdentity || profile.bio ? " mt-5 border-t pt-4" : ""}`}>
        <Stat label="국가" value={statistics.countryCount} />
        <Stat label="도시" value={statistics.cityCount} />
        <Stat label="여행" value={statistics.travelCount} />
      </dl>

      <ProfileConnections
        username={profile.username}
        followerCount={followerCount}
        followingCount={profile.followingCount}
        viewerAuthenticated={viewerAuthenticated}
      />

      {isOwnProfile ? (
        <Link href="/settings#profile" className="profile-panel__primary-action">프로필 편집</Link>
      ) : viewerAuthenticated ? (
        <>
          {safetyStatus?.interactionRestricted ? (
            <p className="profile-panel__restricted" role="status">
              {safetyStatus.blockedByCurrentMember ? "차단한 사용자입니다." : "현재 이 계정과 교류할 수 없습니다."}
            </p>
          ) : (
            <FollowButton
              key={`${profile.username}-${following}`}
              username={profile.username}
              initialFollowing={following}
              onChange={updateFollowing}
            />
          )}
          {safetyStatus ? (
            <ProfileSafetyActions
              username={profile.username}
              status={safetyStatus}
              onStatusChange={updateSafety}
            />
          ) : null}
        </>
      ) : (
        <Link href={`/login?next=/${profile.username}`} className="profile-panel__primary-action">로그인하고 팔로우</Link>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="eyebrow text-[0.62rem]">{label}</dt>
      <dd className="stat-figure text-content mt-1.5 text-[1.6rem]">{formatStat(value)}</dd>
    </div>
  );
}
