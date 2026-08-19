"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

import { TravelImage } from "@/components/common/TravelImage";
import { ApiError, apiMutation } from "@/lib/api/client";
import { profilePath, travelPath } from "@/lib/config";
import type { AuthMember, TravelSocial } from "@/types";

export function TravelSocialPanel({
  travelId,
  ownerUsername,
  currentMember,
  initialSocial,
}: {
  travelId: number;
  ownerUsername: string;
  currentMember: AuthMember | null;
  initialSocial: TravelSocial;
}) {
  const [social, setSocial] = useState(initialSocial);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const loginPath = `/login?next=${encodeURIComponent(travelPath(ownerUsername, travelId))}`;

  async function mutate(path: string, method: "POST" | "DELETE", body?: unknown) {
    setStatus(null);
    try {
      const result = await apiMutation<TravelSocial>(path, method, body);
      if (result) setSocial(result);
      return true;
    } catch (error) {
      setStatus(error instanceof ApiError ? error.message : "요청을 처리하지 못했습니다.");
      return false;
    }
  }

  async function toggleLike() {
    setPendingAction("like");
    await mutate(`/api/private/travels/${travelId}/likes`, "POST");
    setPendingAction(null);
  }

  async function addComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const content = String(formData.get("content") ?? "").trim();
    if (!content) return;
    setPendingAction("comment");
    if (await mutate(`/api/private/travels/${travelId}/comments`, "POST", { content })) {
      form.reset();
    }
    setPendingAction(null);
  }

  async function deleteComment(commentId: number) {
    if (!window.confirm("이 댓글을 삭제할까요?")) return;
    setPendingAction(`delete-${commentId}`);
    await mutate(`/api/private/travels/${travelId}/comments/${commentId}`, "DELETE");
    setPendingAction(null);
  }

  return (
    <section className="travel-social" aria-labelledby="travel-social-heading">
      <div className="travel-social__heading">
        <div>
          <p className="eyebrow">Travel conversation</p>
          <h2 id="travel-social-heading">여행 이야기를 나눠요</h2>
        </div>
        {currentMember ? (
          <button
            type="button"
            className={`travel-social__like${social.likedByCurrentMember ? " is-liked" : ""}`}
            onClick={toggleLike}
            disabled={pendingAction !== null}
            aria-pressed={social.likedByCurrentMember}
          >
            <span aria-hidden="true">{social.likedByCurrentMember ? "♥" : "♡"}</span>
            좋아요 {social.likeCount}
          </button>
        ) : (
          <Link href={loginPath} className="travel-social__like" aria-label="로그인하고 좋아요 남기기">
            <span aria-hidden="true">♡</span> 좋아요 {social.likeCount}
          </Link>
        )}
      </div>

      {currentMember ? (
        <form className="travel-social__composer" onSubmit={addComment}>
          <TravelImage
            src={currentMember.profileImageUrl}
            alt={`${currentMember.displayName} 프로필 이미지`}
            fallbackLabel={currentMember.username.slice(0, 2)}
            className="travel-social__avatar"
          />
          <label>
            <span className="sr-only">댓글</span>
            <textarea name="content" rows={2} maxLength={500} placeholder="여행에서 궁금한 점이나 반가운 마음을 남겨보세요." required />
          </label>
          <button type="submit" disabled={pendingAction !== null}>
            {pendingAction === "comment" ? "남기는 중…" : "댓글 남기기"}
          </button>
        </form>
      ) : (
        <div className="travel-social__guest">
          <p>로그인하고 이 여행에 좋아요와 댓글을 남겨보세요.</p>
          <Link href={loginPath}>로그인하고 대화 참여하기 →</Link>
        </div>
      )}

      {status ? <p className="travel-social__status" role="alert">{status}</p> : null}

      <div className="travel-social__comments">
        <div className="travel-social__count">
          <span>댓글</span>
          <strong>{social.commentCount}</strong>
          {social.commentCount > social.comments.length ? <small>최근 {social.comments.length}개</small> : null}
        </div>
        {social.comments.length ? (
          <ol>
            {social.comments.map((comment) => (
              <li key={comment.id}>
                <Link href={profilePath(comment.author.username)} aria-label={`${comment.author.displayName} 프로필 보기`}>
                  <TravelImage
                    src={comment.author.profileImageUrl}
                    alt={`${comment.author.displayName} 프로필 이미지`}
                    fallbackLabel={comment.author.username.slice(0, 2)}
                    className="travel-social__avatar"
                  />
                </Link>
                <div>
                  <div className="travel-social__comment-meta">
                    <Link href={profilePath(comment.author.username)}>
                      <strong>{comment.author.displayName}</strong>
                      <span>@{comment.author.username}</span>
                    </Link>
                    <time dateTime={comment.createdAt}>{formatCommentDate(comment.createdAt)}</time>
                  </div>
                  <p>{comment.content}</p>
                </div>
                {comment.canDelete ? (
                  <button
                    type="button"
                    onClick={() => deleteComment(comment.id)}
                    disabled={pendingAction !== null}
                    aria-label={`${comment.author.displayName}의 댓글 삭제`}
                  >
                    {pendingAction === `delete-${comment.id}` ? "삭제 중" : "삭제"}
                  </button>
                ) : null}
              </li>
            ))}
          </ol>
        ) : (
          <p className="travel-social__empty">아직 댓글이 없습니다. 첫 이야기를 건네보세요.</p>
        )}
      </div>
    </section>
  );
}

function formatCommentDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
