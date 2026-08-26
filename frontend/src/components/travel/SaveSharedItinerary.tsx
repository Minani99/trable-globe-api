"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { showFeedback } from "@/components/common/AppFeedback";
import { ApiError, apiMutation } from "@/lib/api/client";
import type { TravelDetail, TravelWriteInput } from "@/types";

export function SaveSharedItinerary({ travel, signedIn, isOwner, today }: { travel: TravelDetail; signedIn: boolean; isOwner: boolean; today: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [startDate, setStartDate] = useState(today);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isOwner) {
    return <Link href={`/studio/travels/${travel.id}/edit`} className="shared-itinerary-cta is-owner">내 여행 편집하기 <span aria-hidden="true">→</span></Link>;
  }

  if (!signedIn) {
    return <Link href={`/login?next=${encodeURIComponent(`/${travel.owner.username}/travel/${travel.id}`)}`} className="shared-itinerary-cta">로그인하고 내 계획에 담기 <span aria-hidden="true">＋</span></Link>;
  }

  async function saveToMyPlans() {
    setPending(true);
    setError(null);
    const durationOffset = daysBetween(travel.startDate, travel.endDate);
    const payload: TravelWriteInput = {
      title: `${travel.title.slice(0, 109)}에서 시작한 여행`,
      description: `${travel.owner.displayName}님의 공개 일정에서 가져왔어요. 내 취향과 동선에 맞게 자유롭게 바꿔보세요.`,
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
    }
  }

  return (
    <div className="shared-itinerary-save">
      <button type="button" className="shared-itinerary-cta" onClick={() => setOpen((current) => !current)} aria-expanded={open}>내 계획에 담기 <span aria-hidden="true">＋</span></button>
      {open ? <div className="shared-itinerary-save__panel">
        <div><strong>내 여행 날짜만 골라주세요</strong><p>{travel.places.length}개 장소를 같은 순서로 복사하고, 사진과 개인 예약정보는 가져오지 않아요.</p></div>
        <label><span>새 출발일</span><input type="date" min={today} value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label>
        <button type="button" onClick={saveToMyPlans} disabled={pending || !startDate}>{pending ? "계획에 담는 중…" : `${travel.durationDays}일 일정 담기`}</button>
        {error ? <p className="shared-itinerary-save__error" role="alert">{error}</p> : null}
        <small>{travel.owner.displayName}님의 일정에서 가져온 기록임을 계획에 표시합니다.</small>
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
