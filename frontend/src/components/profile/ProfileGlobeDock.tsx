"use client";

import { useId, useState } from "react";

import { TravelImage } from "@/components/common/TravelImage";
import { ProfilePanel } from "@/components/profile/ProfilePanel";
import { formatStat } from "@/lib/utils/format";
import type { MemberSafetyStatus, UserProfile } from "@/types";

interface ProfileGlobeDockProps {
  profile: UserProfile;
  isOwnProfile: boolean;
  viewerAuthenticated: boolean;
  initialFollowing: boolean;
  initialSafetyStatus: MemberSafetyStatus | null;
}

export function ProfileGlobeDock({
  profile,
  isOwnProfile,
  viewerAuthenticated,
  initialFollowing,
  initialSafetyStatus,
}: ProfileGlobeDockProps) {
  const [expanded, setExpanded] = useState(false);
  const detailsId = useId();
  const { statistics } = profile;

  return (
    <section className={`profile-globe-dock${expanded ? " is-expanded" : ""}`} aria-label="여행자 정보">
      <div className="profile-globe-dock__bar">
        <TravelImage
          src={profile.profileImageUrl}
          alt=""
          fallbackLabel={profile.username.slice(0, 2)}
          className="profile-globe-dock__avatar"
        />
        <span className="profile-globe-dock__identity">
          <strong>{profile.displayName}</strong>
          <small>@{profile.username}</small>
        </span>
        <span
          className="profile-globe-dock__stats"
          aria-label={`나라 ${statistics.countryCount}개, 도시 ${statistics.cityCount}곳, 여행 ${statistics.travelCount}회`}
        >
          <span><strong>{formatStat(statistics.countryCount)}</strong> 나라</span>
          <i aria-hidden="true" />
          <span><strong>{formatStat(statistics.travelCount)}</strong> 여행</span>
        </span>
        <button
          type="button"
          className="profile-globe-dock__toggle"
          aria-expanded={expanded}
          aria-controls={detailsId}
          aria-label={expanded ? "프로필 정보 접기" : "프로필 정보 펼치기"}
          onClick={() => setExpanded((current) => !current)}
        >
          <span>{expanded ? "접기" : "프로필"}</span>
          <svg aria-hidden="true" viewBox="0 0 20 20"><path d="m5 8 5 5 5-5" /></svg>
        </button>
      </div>

      <div id={detailsId} className="profile-globe-dock__details" hidden={!expanded}>
        <ProfilePanel
          profile={profile}
          isOwnProfile={isOwnProfile}
          viewerAuthenticated={viewerAuthenticated}
          initialFollowing={initialFollowing}
          initialSafetyStatus={initialSafetyStatus}
          showIdentity={false}
        />
      </div>
    </section>
  );
}
