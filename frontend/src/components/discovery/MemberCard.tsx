"use client";

import Link from "next/link";

import { TravelImage } from "@/components/common/TravelImage";
import { FollowButton } from "@/components/discovery/FollowButton";
import { formatCount } from "@/lib/utils/format";
import { publicDisplayName } from "@/lib/utils/profile";
import type { MemberDiscovery } from "@/types";

export function MemberCard({ member, viewerAuthenticated }: { member: MemberDiscovery; viewerAuthenticated: boolean }) {
  const displayName = publicDisplayName(member.displayName);
  return (
    <article className="member-card">
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

      <p className="member-card__bio">{member.bio || "여행으로 자신의 세계를 기록하고 있어요."}</p>

      <div className="member-card__reason">
        <span>추천 이유</span>
        <strong>{member.recommendationReason}</strong>
      </div>

      <dl className="member-card__stats">
        <MemberStat label="국가" value={member.countryCount} />
        <MemberStat label="여행" value={member.travelCount} />
        <MemberStat label="팔로워" value={member.followerCount} />
      </dl>

      <div className="member-card__actions">
        <Link href={`/${member.username}`}>지구본 보기 <span aria-hidden="true">→</span></Link>
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

function MemberStat({ label, value }: { label: string; value: number }) {
  return <div><dt>{label}</dt><dd>{formatCount(value)}</dd></div>;
}
