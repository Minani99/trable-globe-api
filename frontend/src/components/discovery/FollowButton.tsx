"use client";

import { useState } from "react";

import { ApiError } from "@/lib/api/client";
import { followMember, unfollowMember } from "@/lib/api/discovery";
import type { FollowStatus } from "@/types";

export function FollowButton({
  username,
  initialFollowing,
  onChange,
  compact = false,
}: {
  username: string;
  initialFollowing: boolean;
  onChange?: (status: FollowStatus) => void;
  compact?: boolean;
}) {
  const [following, setFollowing] = useState(initialFollowing);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setPending(true);
    setError(null);
    try {
      const result = following ? await unfollowMember(username) : await followMember(username);
      if (result) {
        setFollowing(result.following);
        onChange?.(result);
      }
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "팔로우 상태를 바꾸지 못했습니다.");
    } finally {
      setPending(false);
    }
  }

  return (
    <span className="follow-action">
      <button
        type="button"
        className={`follow-button${following ? " is-following" : ""}${compact ? " is-compact" : ""}`}
        aria-pressed={following}
        disabled={pending}
        onClick={toggle}
      >
        {pending ? "처리 중…" : following ? "팔로잉" : "팔로우"}
      </button>
      {error ? <small role="alert" className="follow-action__error">{error}</small> : null}
    </span>
  );
}
