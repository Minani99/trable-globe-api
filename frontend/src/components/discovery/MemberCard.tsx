"use client";

import Link from "next/link";

import { TravelImage } from "@/components/common/TravelImage";
import { FollowButton } from "@/components/discovery/FollowButton";
import { MemberWorldPreview } from "@/components/discovery/MemberWorldPreview";
import { formatCount } from "@/lib/utils/format";
import { publicDisplayName } from "@/lib/utils/profile";
import type { MemberDiscovery } from "@/types";

export function MemberCard({ member, viewerAuthenticated }: { member: MemberDiscovery; viewerAuthenticated: boolean }) {
  const displayName = publicDisplayName(member.displayName);
  const cityCount = member.cityCount ?? 0;
  const recentDestinations = member.recentDestinations ?? [];
  const worldCountries = member.worldCountries ?? [];
  return (
    <article className="member-card">
      <Link href={`/${member.username}`} className="member-card__world" aria-label={`${displayName}님의 여행 세계 보기`}>
        <MemberWorldPreview countries={worldCountries} displayName={displayName} id={member.username} />
        <span>{formatCount(member.travelCount)} JOURNEYS</span>
      </Link>

      <Link href={`/${member.username}`} className="member-card__identity" aria-label={`${displayName} 프로필 보기`}>
        <TravelImage
          src={member.profileImageUrl}
          alt={`${displayName} 프로필 이미지`}
          fallbackLabel={member.username.slice(0, 2)}
          className="member-card__avatar"
        />
        <span className="member-card__name">
          <strong>{displayName}</strong>
          <small>@{member.username}</small>
        </span>
      </Link>

      <div className="member-card__footprint">
        <strong>
          {formatCount(member.countryCount)} Countries <span aria-hidden="true">·</span> {formatCount(cityCount)} Cities
        </strong>
        <p>
          {recentDestinations.length > 0 ? (
            <>최근 여행 <b>{recentDestinations.join(" · ")}</b></>
          ) : (
            "첫 Journey를 준비하고 있어요."
          )}
        </p>
      </div>

      <div className="member-card__reason">
        <strong>{member.recommendationReason}</strong>
      </div>

      <div className="member-card__actions">
        <Link href={`/${member.username}`}>Travel World 보기 <span aria-hidden="true">→</span></Link>
        {viewerAuthenticated ? (
          <FollowButton
            username={member.username}
            initialFollowing={member.following}
            compact
          />
        ) : (
          <Link href="/login?next=/discover" className="follow-button is-compact">팔로우</Link>
        )}
      </div>
    </article>
  );
}
