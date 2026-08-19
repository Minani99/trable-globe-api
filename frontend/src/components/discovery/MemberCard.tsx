"use client";

import Link from "next/link";
import { useState } from "react";

import { TravelImage } from "@/components/common/TravelImage";
import { FollowButton } from "@/components/discovery/FollowButton";
import type { MemberDiscovery } from "@/types";

export function MemberCard({ member, viewerAuthenticated }: { member: MemberDiscovery; viewerAuthenticated: boolean }) {
  const [followerCount, setFollowerCount] = useState(member.followerCount);

  return (
    <article className="member-card">
      <Link href={`/${member.username}`} className="member-card__identity" aria-label={`${member.displayName} 프로필 보기`}>
        <TravelImage
          src={member.profileImageUrl}
          alt={`${member.displayName} 프로필 이미지`}
          fallbackLabel={member.username.slice(0, 2)}
          className="member-card__avatar"
        />
        <span className="member-card__name">
          <strong>{member.displayName}</strong>
          <small>@{member.username}</small>
        </span>
      </Link>

      <p className="member-card__bio">{member.bio || "여행으로 자신의 세계를 기록하고 있어요."}</p>

      <div className="member-card__reason">
        <span aria-hidden="true">◎</span>
        {member.recommendationReason}
      </div>

      <dl className="member-card__stats">
        <div><dt>방문 국가</dt><dd>{member.countryCount}</dd></div>
        <div><dt>여행</dt><dd>{member.travelCount}</dd></div>
        <div><dt>팔로워</dt><dd>{followerCount}</dd></div>
      </dl>

      <div className="member-card__actions">
        <Link href={`/${member.username}`}>지구본 보기 <span aria-hidden="true">→</span></Link>
        {viewerAuthenticated ? (
          <FollowButton
            username={member.username}
            initialFollowing={member.following}
            compact
            onChange={(status) => setFollowerCount(status.followerCount)}
          />
        ) : (
          <Link href="/login?next=/discover" className="follow-button is-compact">팔로우</Link>
        )}
      </div>
    </article>
  );
}
