"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { TravelImage } from "@/components/common/TravelImage";
import { FollowButton } from "@/components/discovery/FollowButton";
import {
  fetchMemberConnections,
  type ConnectionKind,
} from "@/lib/api/discovery";
import { formatCount } from "@/lib/utils/format";
import { publicDisplayName } from "@/lib/utils/profile";
import type { FollowStatus, MemberConnection } from "@/types";

export function ProfileConnections({
  username,
  followerCount,
  followingCount,
  viewerAuthenticated,
}: {
  username: string;
  followerCount: number;
  followingCount: number;
  viewerAuthenticated: boolean;
}) {
  const [activeKind, setActiveKind] = useState<ConnectionKind | null>(null);
  const [connections, setConnections] = useState<MemberConnection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!activeKind) return;
    closeButtonRef.current?.focus();
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setActiveKind(null);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [activeKind]);

  async function open(kind: ConnectionKind) {
    setActiveKind(kind);
    setConnections([]);
    setError(null);
    setLoading(true);
    try {
      setConnections(await fetchMemberConnections(username, kind, viewerAuthenticated));
    } catch {
      setError("목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }

  function updateConnection(connectionUsername: string, status: FollowStatus) {
    setConnections((current) => current.map((connection) => (
      connection.username === connectionUsername
        ? { ...connection, following: status.following, followerCount: status.followerCount }
        : connection
    )));
  }

  const title = activeKind === "followers" ? "팔로워" : "팔로잉";

  return (
    <>
      <div className="profile-panel__social" aria-label="프로필 연결">
        <button type="button" onClick={() => void open("followers")}>
          <strong>{formatCount(followerCount)}</strong> 팔로워
        </button>
        <button type="button" onClick={() => void open("following")}>
          <strong>{formatCount(followingCount)}</strong> 팔로잉
        </button>
      </div>

      {activeKind ? createPortal(
        <div
          className="profile-connections__backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setActiveKind(null);
          }}
        >
          <section
            className="profile-connections"
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-connections-title"
          >
            <header>
              <div>
                <h2 id="profile-connections-title">{title}</h2>
                <p>@{username}</p>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                className="profile-connections__close"
                onClick={() => setActiveKind(null)}
                aria-label={`${title} 목록 닫기`}
              >
                <svg aria-hidden="true" viewBox="0 0 24 24">
                  <path d="m7 7 10 10M17 7 7 17" />
                </svg>
              </button>
            </header>

            <div className="profile-connections__list">
              {loading ? <p className="profile-connections__state">목록을 불러오는 중…</p> : null}
              {error ? <p className="profile-connections__state is-error" role="alert">{error}</p> : null}
              {!loading && !error && connections.length === 0 ? (
                <p className="profile-connections__state">아직 {title}이 없습니다.</p>
              ) : null}
              {connections.map((connection) => (
                <article className="profile-connection" key={connection.username}>
                  <Link href={`/${connection.username}`} onClick={() => setActiveKind(null)}>
                    <TravelImage
                      src={connection.profileImageUrl}
                      alt=""
                      fallbackLabel={connection.username.slice(0, 2)}
                      className="profile-connection__avatar"
                    />
                    <span>
                      <strong>{publicDisplayName(connection.displayName)}</strong>
                      <small>@{connection.username} · 팔로워 {formatCount(connection.followerCount)}</small>
                    </span>
                  </Link>
                  {viewerAuthenticated && !connection.currentMember ? (
                    <FollowButton
                      username={connection.username}
                      initialFollowing={connection.following}
                      compact
                      onChange={(status) => updateConnection(connection.username, status)}
                    />
                  ) : !viewerAuthenticated ? (
                    <Link href={`/login?next=/${connection.username}`} className="follow-button is-compact">
                      팔로우
                    </Link>
                  ) : null}
                </article>
              ))}
            </div>
          </section>
        </div>,
        document.body,
      ) : null}
    </>
  );
}
