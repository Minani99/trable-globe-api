"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { showFeedback } from "@/components/common/AppFeedback";
import { ApiError, apiMutation } from "@/lib/api/client";
import { publicDisplayName } from "@/lib/utils/profile";
import type { TravelDetail, TravelWriteInput } from "@/types";

export function SaveSharedItinerary({ travel, signedIn, isOwner, today, returnPath }: { travel: TravelDetail; signedIn: boolean; isOwner: boolean; today: string; returnPath?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [startDate, setStartDate] = useState(today);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const saving = useRef(false);
  const validStart = /^\d{4}-\d{2}-\d{2}$/.test(startDate) && startDate >= today && Number.isFinite(Date.parse(`${startDate}T00:00:00Z`)) && addDays(startDate, 0) === startDate;
  const endDate = validStart ? addDays(startDate, daysBetween(travel.startDate, travel.endDate)) : null;
  const validRange = Boolean(endDate && /^\d{4}-\d{2}-\d{2}$/.test(endDate));
  const ownerName = publicDisplayName(travel.owner.displayName);

  if (isOwner) {
    return <Link href={`/studio/travels/${travel.id}/edit`} className="shared-itinerary-cta is-owner">내 여행 편집하기 </Link>;
  }

  if (!signedIn) {
    return (
      <div className="shared-itinerary-save">
        <Link href={`/login?next=${encodeURIComponent(returnPath ?? `/${travel.owner.username}/travel/${travel.id}`)}`} className="shared-itinerary-cta">
          로그인하고 내 계획으로 복사 <span aria-hidden="true">＋</span>
        </Link>
        <p className="shared-itinerary-save__note">장소·순서·시간·메모를 복사합니다. 사진·예약·예산은 포함하지 않습니다.</p>
      </div>
    );
  }

  async function saveToMyPlans() {
    if (saving.current) return;
    if (!validRange) { setError("오늘 이후의 출발일을 골라 주세요."); return; }
    saving.current = true;
    setPending(true);
    setError(null);
    const durationOffset = daysBetween(travel.startDate, travel.endDate);
    const payload: TravelWriteInput = {
      title: travel.title,
      description: `${ownerName}님의 일정에서 복사했습니다.\n${travel.description ?? ""}`.slice(0, 2000),
      startDate,
      endDate: addDays(startDate, durationOffset),
      coverImageUrl: null,
      visibility: "PRIVATE",
      places: travel.places.map((place) => ({
        country: place.country,
        city: place.city ? {
          nameEn: place.city.nameEn,
          nameKo: place.city.nameKo,
          latitude: place.city.latitude,
          longitude: place.city.longitude,
        } : null,
        placeName: place.placeName,
        latitude: place.latitude,
        longitude: place.longitude,
        visitedAt: addDays(startDate, place.visitedAt ? daysBetween(travel.startDate, place.visitedAt) : 0),
        startTime: place.startTime,
        durationMinutes: place.durationMinutes,
        memo: place.memo,
      })),
      photos: [],
    };

    try {
      const result = await apiMutation<TravelDetail>("/api/private/travels", "POST", payload);
      if (!result) throw new ApiError(500, "가져온 계획을 확인할 수 없습니다.");
      showFeedback("내 여행 계획에 담았습니다. 날짜와 장소를 자유롭게 바꿔보세요.", "success");
      router.push(`/studio/travels/${result.id}/edit?plan=1&source=${travel.id}`);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "일정을 내 계획에 담지 못했습니다.");
      setPending(false);
      saving.current = false;
    }
  }

  return (
    <div className="shared-itinerary-save">
      <button type="button" className="shared-itinerary-cta" disabled={pending} onClick={() => setOpen((current) => !current)} aria-expanded={open}>내 계획으로 복사 <span aria-hidden="true">＋</span></button>
      {!open ? <p className="shared-itinerary-save__note">방문 순서와 메모는 그대로, 날짜는 내 여행에 맞춰 복사해요.</p> : null}
      {open ? <div className="shared-itinerary-save__panel" aria-busy={pending}>
        <div><strong>내 여행에 일정 복사</strong><p>{travel.places.length}개 장소의 방문 순서·시간·메모를 그대로 복사합니다. 사진·예약·예산은 포함하지 않으며, 복사본은 나만 볼 수 있어요.</p></div>
        <label><span>새 출발일</span><input type="date" min={today} value={startDate} disabled={pending} onChange={(event) => { setStartDate(event.target.value); setError(null); }} /></label>
        {validRange ? <p className="shared-itinerary-save__period" role="status">내 여행 기간: <time dateTime={startDate}>{startDate}</time> ~ <time dateTime={endDate!}>{endDate}</time> · {travel.durationDays}일</p> : null}
        <button type="button" onClick={saveToMyPlans} disabled={pending || !validRange}>{pending ? "계획에 담는 중…" : `${travel.durationDays}일 일정 복사`}</button>
        {error ? <p className="shared-itinerary-save__error" role="alert">{error}</p> : null}
        <small>{ownerName}님의 일정에서 가져온 기록임을 계획에 표시합니다.</small>
      </div> : null}
    </div>
  );
}

function addDays(value: string, amount: number): string {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + amount)).toISOString().slice(0, 10);
}

function daysBetween(start: string, end: string): number {
  return Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86_400_000);
}
