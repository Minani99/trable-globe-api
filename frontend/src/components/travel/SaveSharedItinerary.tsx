"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";

import { showFeedback } from "@/components/common/AppFeedback";
import { ApiError, apiMutation } from "@/lib/api/client";
import { publicDisplayName } from "@/lib/utils/profile";
import type { TravelDetail, TravelWriteInput } from "@/types";

export function SaveSharedItinerary({ travel, signedIn, isOwner, today, returnPath, copyDate, copyDay, skipStops }: { travel: TravelDetail; signedIn: boolean; isOwner: boolean; today: string; returnPath?: string; copyDate?: string | string[]; copyDay?: string | string[]; skipStops?: string | string[] }) {
  const router = useRouter();
  const resumeDate = typeof copyDate === "string" && isStartDate(copyDate, today) ? copyDate : null;
  const [open, setOpen] = useState(Boolean(resumeDate));
  const [startDate, setStartDate] = useState(resumeDate ?? today);
  const byDate = useMemo(() => {
    const groups = new Map<string, TravelDetail["places"]>();
    for (const place of travel.places) {
      const key = place.visitedAt || "";
      const group = groups.get(key);
      if (group) group.push(place);
      else groups.set(key, [place]);
    }
    return groups;
  }, [travel.places]);
  const dates = [...byDate.keys()].filter(Boolean).sort();
  const [sourceDay, setSourceDay] = useState(typeof copyDay === "string" && dates.includes(copyDay) ? copyDay : "");
  const [skipped, setSkipped] = useState<number[]>(() => {
    const ids = new Set(typeof skipStops === "string" ? skipStops.split(",") : []);
    return travel.places.filter(place => sourceDay && place.visitedAt === sourceDay && ids.has(String(place.id))).map(place => place.id);
  });
  const dayPlaces = sourceDay ? byDate.get(sourceDay) ?? [] : travel.places;
  const places = sourceDay ? dayPlaces.filter(place => !skipped.includes(place.id)) : dayPlaces;
  const allSelected = places.length === dayPlaces.length;
  const canCopy = !sourceDay || places.length > 0;
  const duration = sourceDay ? 1 : travel.durationDays;
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const saving = useRef(false);
  const dateInput = useRef<HTMLInputElement>(null);
  const routeTrigger = useRef<HTMLButtonElement>(null);
  const validStart = isStartDate(startDate, today);
  const endDate = validStart ? (sourceDay ? startDate : addDays(startDate, daysBetween(travel.startDate, travel.endDate))) : null;
  const validRange = Boolean(endDate && /^\d{4}-\d{2}-\d{2}$/.test(endDate));
  const ownerName = publicDisplayName(travel.owner.displayName);

  if (isOwner) {
    return <Link href={`/studio/travels/${travel.id}/edit`} className="shared-itinerary-cta is-owner">내 여행 편집하기 </Link>;
  }

  const path = returnPath ?? `/${travel.owner.username}/travel/${travel.id}`;
  const next = encodeURIComponent(`${path}?copyDate=${startDate}${sourceDay ? `&copyDay=${sourceDay}` : ""}${sourceDay && skipped.length ? "&skipStops=" + skipped.join(",") : ""}#copy-plan`);

  function copiedDate(date: string) {
    return addDays(startDate, daysBetween(sourceDay || travel.startDate, date));
  }

  async function saveToMyPlans() {
    if (saving.current || !canCopy) return;
    if (!validRange) { setError("오늘 이후의 출발일을 골라 주세요."); return; }
    saving.current = true;
    setPending(true);
    setError(null);
    const payload: TravelWriteInput = {
      title: travel.title,
      description: `${ownerName}님의 일정에서 복사했습니다.\n${travel.description ?? ""}`.slice(0, 2000),
      startDate,
      endDate: endDate!,
      coverImageUrl: null,
      visibility: "PRIVATE",
      places: places.map((place) => ({
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
        visitedAt: place.visitedAt ? copiedDate(place.visitedAt) : null,
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
    <form className="shared-itinerary-save" id="copy-plan" onSubmit={event => {
      event.preventDefault();
      const button = (event.nativeEvent as SubmitEvent).submitter;
      if (saving.current || !(button instanceof HTMLButtonElement) || button.name !== "sourceDay" || !dates.includes(button.value)) return;
      routeTrigger.current = button;
      setOpen(true);
      if (button.value !== sourceDay) setSkipped([]);
      setSourceDay(button.value);
      setError(null);
      requestAnimationFrame(() => {
        dateInput.current?.focus({ preventScroll: true });
        dateInput.current?.closest("form")?.scrollIntoView({ block: "start" });
      });
    }}>
      <button type="button" className="shared-itinerary-cta" disabled={pending} onClick={() => {
        setOpen(!open);
        const trigger = routeTrigger.current;
        routeTrigger.current = null;
        if (open && trigger) requestAnimationFrame(() => {
          if (trigger.isConnected) trigger.focus();
        });
      }} aria-expanded={open}>
        {open ? "복사 옵션 접기" : "내 계획으로 복사"}
        <span aria-hidden="true">{open ? "−" : "＋"}</span>
      </button>
      {!open ? <p className="shared-itinerary-save__note">내 출발일로 방문 순서와 메모를 가져와요. 사진·예약·예산은 포함하지 않습니다.</p> : null}
      {open ? <div className="shared-itinerary-save__panel" aria-busy={pending}>
        <div><strong>내 여행에 일정 복사</strong><p>{places.length}개 장소의 방문 순서·시간·메모를 내 비공개 계획에 담아요. 사진·예약·예산은 포함하지 않습니다.</p></div>
        {dates.length > 0 && (travel.durationDays > 1 || travel.places.some(place => !place.visitedAt)) && <label>
          <span>가져올 코스</span>
          <select value={sourceDay} disabled={pending} onChange={event => { setSkipped([]); setSourceDay(event.target.value); setError(null); }}>
            <option value="">전체 일정 · {travel.durationDays}일</option>
            {dates.map(date => <option key={date} value={date}>{daysBetween(travel.startDate, date) + 1}일차 · {date}</option>)}
          </select>
        </label>}
        {sourceDay && dayPlaces.length > 1 && <div className="shared-itinerary-save__selection">
          <span role="status">{dayPlaces.length}곳 중 {places.length}곳 선택</span>
          <button type="button" disabled={pending} onClick={() => setSkipped(allSelected ? dayPlaces.map(place => place.id) : [])}>
            {allSelected ? "전체 해제" : "전체 선택"}
          </button>
        </div>}
        {sourceDay && <ol className="shared-itinerary-save__stops" aria-label="선택한 하루의 방문 순서">
          {dayPlaces.map(place => <li key={place.id}>
            <label>
              <input type="checkbox" disabled={pending} checked={!skipped.includes(place.id)} onChange={event => {
                const include = event.target.checked;
                setSkipped(current => include ? current.filter(id => id !== place.id) : [...current, place.id]);
              }} />
              {place.placeName}
            </label>
          </li>)}
        </ol>}
        <label><span>새 출발일</span><input ref={dateInput} type="date" min={today} value={startDate} disabled={pending} aria-invalid={!validRange} aria-describedby="copy-date-summary" onChange={(event) => { setStartDate(event.target.value); setError(null); }} /></label>
        {validRange ? <p id="copy-date-summary" className="shared-itinerary-save__period" role="status">내 여행 기간 · <time dateTime={startDate}>{startDate}</time>{endDate !== startDate && <> ~ <time dateTime={endDate!}>{endDate}</time></>} · {duration}일</p>
          : <p id="copy-date-summary" className="shared-itinerary-save__error" role="status">{startDate < today && startDate ? "오늘 또는 이후 날짜를 선택해 주세요." : "복사할 여행의 출발일을 입력해 주세요."}</p>}
        {validRange && !sourceDay && places.length > 0 && <details className="shared-itinerary-save__preview">
          <summary>내 날짜로 방문 순서 보기</summary>
          {[...dates, ...(byDate.has("") ? [""] : [])].map(date => <div key={date}>
            <strong>{date ? <time dateTime={copiedDate(date)}>{copiedDate(date)}</time> : "날짜 미정"}</strong>
            <ol>{byDate.get(date)?.map(place => <li key={place.id}>{place.placeName}</li>)}</ol>
          </div>)}
        </details>}
        {!canCopy && <p role="status">가져올 장소를 한 곳 이상 선택해 주세요.</p>}
        {signedIn ? <button type="button" onClick={saveToMyPlans} disabled={pending || !validRange || !canCopy}>{pending ? "계획에 담는 중…" : `${duration}일 일정 복사`}</button> :
          validRange && canCopy && <div className="shared-itinerary-save__auth">
            <Link prefetch={false} href={`/register?next=${next}`} className="shared-itinerary-cta">가입하고 계속</Link>
            <Link prefetch={false} href={`/login?next=${next}`}>로그인하고 계속</Link>
          </div>}
        {error ? <p className="shared-itinerary-save__error" role="alert">{error}</p> : null}
        <small>{ownerName}님의 일정에서 가져온 기록임을 계획에 표시합니다.</small>
      </div> : null}
    </form>
  );
}

function isStartDate(value: string, today: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && value >= today && Number.isFinite(Date.parse(`${value}T00:00:00Z`)) && addDays(value, 0) === value;
}

function addDays(value: string, amount: number): string {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + amount)).toISOString().slice(0, 10);
}

function daysBetween(start: string, end: string): number {
  return Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86_400_000);
}
