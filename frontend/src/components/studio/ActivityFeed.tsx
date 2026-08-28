import Link from "next/link";

import { TravelImage } from "@/components/common/TravelImage";
import { publicDisplayName } from "@/lib/utils/profile";
import type { ActivityEvent } from "@/types";

export function ActivityFeed({ events }: { events: ActivityEvent[] }) {
  return (
    <section id="activity" className="studio-activity" aria-labelledby="studio-activity-heading">
      <div className="studio-section-heading">
        <div><p className="eyebrow">Activity</p><h2 id="studio-activity-heading">최근 활동</h2></div>
        <Link href="/discover">여행자 찾기 →</Link>
      </div>
      {events.length ? (
        <ol className="studio-activity__list">
          {events.map((event) => (
            <li key={event.id}>
              <Link href={event.type === "FOLLOW" ? `/${event.actor.username}` : `/studio/travels/${event.travelId}/edit`}>
                <TravelImage src={event.actor.profileImageUrl} alt="" fallbackLabel={event.actor.username.slice(0, 2)} className="studio-activity__avatar" />
                <span>
                  <strong>{publicDisplayName(event.actor.displayName)}</strong>
                  <p>{activityCopy(event)}</p>
                  {event.preview ? <q>{event.preview}</q> : null}
                </span>
                <time dateTime={event.createdAt}>{formatActivityDate(event.createdAt)}</time>
              </Link>
            </li>
          ))}
        </ol>
      ) : (
        <div className="studio-activity__empty">
          <span aria-hidden="true">◎</span>
          <div><strong>아직 새 활동이 없어요</strong><p>여행자를 팔로우하고 기록을 공개하면 좋아요와 이야기가 이곳에 모입니다.</p></div>
          <Link href="/discover">여행자 둘러보기</Link>
        </div>
      )}
    </section>
  );
}

function activityCopy(event: ActivityEvent): string {
  if (event.type === "FOLLOW") return "내 여행 세계를 팔로우하기 시작했어요.";
  if (event.type === "LIKE") return `‘${event.travelTitle ?? "여행 기록"}’을 좋아해요.`;
  return `‘${event.travelTitle ?? "여행 기록"}’에 이야기를 남겼어요.`;
}

function formatActivityDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "최근";
  return new Intl.DateTimeFormat("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Seoul" }).format(date);
}
