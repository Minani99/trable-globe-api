"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { ApiError, apiMutation } from "@/lib/api/client";
import { deleteUploadedPhoto, getUploadConfiguration, uploadPhoto } from "@/lib/uploads/client";
import type { TravelDetail, TravelPlace } from "@/types";

type ForecastDay = {
  date: string;
  weatherCode: number;
  temperatureMax: number | null;
  temperatureMin: number | null;
  precipitationProbability: number;
};

type ForecastResponse = {
  success: boolean;
  data: { available: boolean; days: ForecastDay[] } | null;
};

export function MobileTripCompanion({
  travel,
  today,
  variant = "sheet",
}: {
  travel: TravelDetail;
  today: string;
  variant?: "sheet" | "page";
}) {
  const [currentTravel, setCurrentTravel] = useState(travel);
  const [forecast, setForecast] = useState<ForecastDay | null>(null);
  const [composer, setComposer] = useState<"note" | "photo" | null>(null);
  const [selectedPlaceId, setSelectedPlaceId] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [pendingAction, setPendingAction] = useState<"place" | "note" | "photo" | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const dayNumber = Math.max(1, Math.min(currentTravel.durationDays, differenceInDays(currentTravel.startDate, today) + 1));
  const todaysPlaces = useMemo(() => placesForDay(currentTravel.places, today), [today, currentTravel.places]);
  const nextPlace = useMemo(() => findNextPlace(todaysPlaces), [todaysPlaces]);
  const selectedPlace = todaysPlaces.find((place) => place.id === selectedPlaceId) ?? nextPlace ?? todaysPlaces[0] ?? null;
  const location = todaysPlaces[0] ?? currentTravel.places[0];

  useEffect(() => {
    if (!location) return;
    const controller = new AbortController();
    const params = new URLSearchParams({
      latitude: String(location.latitude),
      longitude: String(location.longitude),
      startDate: today,
      endDate: today,
    });
    fetch(`/api/weather/forecast?${params}`, { signal: controller.signal })
      .then(async (response) => {
        const body = await response.json() as ForecastResponse;
        if (response.ok && body.success && body.data?.available) {
          setForecast(body.data.days.find((day) => day.date === today) ?? null);
        }
      })
      .catch((error) => {
        if (!(error instanceof Error && error.name === "AbortError")) setForecast(null);
      });
    return () => controller.abort();
  }, [location, today]);

  async function updatePlace(place: TravelPlace, completed: boolean, nextMemo = place.memo ?? "") {
    setPendingAction("place");
    setStatus(null);
    try {
      const result = await apiMutation<TravelDetail>(`/api/private/travels/${currentTravel.id}/places/${place.id}`, "PATCH", {
        memo: nextMemo.trim() || null,
        completed,
      });
      if (!result) throw new ApiError(500, "저장된 일정을 확인할 수 없습니다.");
      setCurrentTravel(result);
      setStatus(completed ? `${place.placeName} 일정을 완료했어요.` : `${place.placeName} 일정을 다시 열었어요.`);
    } catch (error) {
      setStatus(error instanceof ApiError ? error.message : "일정을 저장하지 못했습니다.");
    } finally {
      setPendingAction(null);
    }
  }

  function openComposer(type: "note" | "photo") {
    const place = selectedPlace ?? todaysPlaces[0];
    setSelectedPlaceId(place?.id ?? null);
    setNote(type === "note" ? place?.memo ?? "" : "");
    setStatus(null);
    setComposer(type);
  }

  async function saveNote() {
    if (!selectedPlace) return;
    setPendingAction("note");
    setStatus(null);
    try {
      const result = await apiMutation<TravelDetail>(`/api/private/travels/${currentTravel.id}/places/${selectedPlace.id}`, "PATCH", {
        memo: note.trim() || null,
        completed: Boolean(selectedPlace.completedAt),
      });
      if (!result) throw new ApiError(500, "저장된 메모를 확인할 수 없습니다.");
      setCurrentTravel(result);
      setComposer(null);
      setStatus(`${selectedPlace.placeName}에 메모를 남겼어요.`);
    } catch (error) {
      setStatus(error instanceof ApiError ? error.message : "메모를 저장하지 못했습니다.");
    } finally {
      setPendingAction(null);
    }
  }

  async function addPhoto(file: File) {
    setPendingAction("photo");
    setUploadProgress(0);
    setStatus(null);
    let uploaded: { objectKey: string; publicUrl: string } | null = null;
    try {
      const configuration = await getUploadConfiguration();
      if (!configuration.configured) throw new ApiError(503, "사진 저장소가 아직 연결되지 않았습니다.");
      if (!configuration.acceptedTypes.includes(file.type)) throw new ApiError(400, "JPG, PNG, WebP 사진만 올릴 수 있습니다.");
      if (file.size > configuration.maxBytes) throw new ApiError(400, `사진은 장당 ${Math.round(configuration.maxBytes / 1024 / 1024)}MB 이하여야 합니다.`);
      if (currentTravel.photos.length >= configuration.maxPhotos) throw new ApiError(400, `사진은 여행당 최대 ${configuration.maxPhotos}장까지 올릴 수 있습니다.`);
      uploaded = await uploadPhoto(file, setUploadProgress);
      const result = await apiMutation<TravelDetail>(`/api/private/travels/${currentTravel.id}/photos`, "POST", {
        imageUrl: uploaded.publicUrl,
        caption: null,
        takenAt: today,
        travelPlaceId: selectedPlace?.id ?? null,
      });
      if (!result) throw new ApiError(500, "저장된 사진을 확인할 수 없습니다.");
      setCurrentTravel(result);
      setComposer(null);
      setStatus(`${selectedPlace?.placeName ?? "오늘 여행"}에 사진을 기록했어요.`);
    } catch (error) {
      if (uploaded) await deleteUploadedPhoto({ objectKey: uploaded.objectKey }).catch(() => undefined);
      setStatus(error instanceof ApiError ? error.message : "사진을 기록하지 못했습니다.");
    } finally {
      setPendingAction(null);
      setUploadProgress(0);
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  }

  const editPath = `/studio/travels/${currentTravel.id}/edit`;
  return (
    <section className={`mobile-trip-companion is-${variant}`} aria-labelledby={`mobile-trip-${variant}-${currentTravel.id}`}>
      <header className="mobile-trip-companion__heading">
        <div>
          <span>DAY {dayNumber} · {formatShortDate(today)}</span>
          <h2 id={`mobile-trip-${variant}-${currentTravel.id}`}>오늘 일정</h2>
        </div>
        {forecast ? (
          <p className={isRain(forecast) ? "has-rain" : undefined}>
            <strong>{weatherIcon(forecast.weatherCode)}</strong>
            <span>{formatTemperature(forecast)} · 비 {forecast.precipitationProbability}%</span>
          </p>
        ) : null}
      </header>

      {nextPlace ? (
        <a className="mobile-trip-companion__next" href={googleMapsUrl(nextPlace)} target="_blank" rel="noreferrer">
          <span>{isFuturePlace(nextPlace) ? "다음 일정" : "마지막 일정"}</span>
          <strong>{formatTime(nextPlace.startTime) ?? "시간 미정"} · {nextPlace.placeName}</strong>
          <small>지도에서 위치 보기 <b aria-hidden="true">↗</b></small>
        </a>
      ) : todaysPlaces.length ? (
        <div className="mobile-trip-companion__empty is-complete">
          <strong>오늘 일정을 모두 마쳤어요.</strong>
          <p>남긴 사진과 메모는 여행 기록에 그대로 이어집니다.</p>
        </div>
      ) : (
        <div className="mobile-trip-companion__empty">
          <strong>오늘 정해진 장소가 없어요.</strong>
          <p>현재 위치에서 장소를 추가하거나 전체 계획을 확인하세요.</p>
        </div>
      )}

      {todaysPlaces.length ? (
        <ol className="mobile-trip-companion__timeline" aria-label={`${currentTravel.title} 오늘 일정`}>
          {todaysPlaces.map((place) => (
            <li key={place.id} className={`${place.id === nextPlace?.id ? "is-next " : ""}${place.completedAt ? "is-complete" : ""}`.trim()}>
              <time>{formatTime(place.startTime) ?? "--:--"}</time>
              <button
                type="button"
                aria-label={`${place.placeName} ${place.completedAt ? "미완료로 변경" : "완료"}`}
                aria-pressed={Boolean(place.completedAt)}
                disabled={pendingAction !== null}
                onClick={() => void updatePlace(place, !place.completedAt)}
              >{place.completedAt ? "✓" : ""}</button>
              <a href={googleMapsUrl(place)} target="_blank" rel="noreferrer">
                <strong>{place.placeName}</strong>
                <small>{place.city?.nameKo ?? place.country.nameKo}{place.durationMinutes ? ` · ${formatDuration(place.durationMinutes)}` : ""}{place.memo ? ` · ${place.memo}` : ""}</small>
              </a>
            </li>
          ))}
        </ol>
      ) : null}

      <nav className="mobile-trip-companion__actions" aria-label="여행 중 바로 기록">
        <Link href={`${editPath}#travel-place-editor`}><QuickActionIcon name="place" /><strong>장소</strong></Link>
        <button type="button" onClick={() => openComposer("photo")} disabled={!todaysPlaces.length || pendingAction !== null}><QuickActionIcon name="photo" /><strong>사진</strong></button>
        <button type="button" onClick={() => openComposer("note")} disabled={!todaysPlaces.length || pendingAction !== null}><QuickActionIcon name="note" /><strong>메모</strong></button>
        <Link href={editPath}><QuickActionIcon name="more" /><strong>전체</strong></Link>
      </nav>

      {composer ? (
        <div className="mobile-trip-companion__composer" role="group" aria-label={composer === "note" ? "빠른 메모" : "빠른 사진 기록"}>
          <header><strong>{composer === "note" ? "메모 남기기" : "사진 기록하기"}</strong><button type="button" onClick={() => setComposer(null)} aria-label="빠른 기록 닫기">×</button></header>
          {todaysPlaces.length > 1 ? (
            <label><span>연결할 일정</span><select value={selectedPlace?.id ?? ""} onChange={(event) => { const id = Number(event.target.value); const place = todaysPlaces.find((item) => item.id === id); setSelectedPlaceId(id); if (composer === "note") setNote(place?.memo ?? ""); }}>{todaysPlaces.map((place) => <option key={place.id} value={place.id}>{formatTime(place.startTime) ?? "시간 미정"} · {place.placeName}</option>)}</select></label>
          ) : selectedPlace ? <p className="mobile-trip-companion__composer-place">{selectedPlace.placeName}</p> : null}
          {composer === "note" ? (
            <><label><span>한 줄 메모</span><textarea value={note} maxLength={1000} rows={3} onChange={(event) => setNote(event.target.value)} placeholder="기억하고 싶은 내용을 적어주세요" /></label><button className="mobile-trip-companion__composer-submit" type="button" disabled={pendingAction !== null} onClick={() => void saveNote()}>{pendingAction === "note" ? "저장 중…" : "메모 저장"}</button></>
          ) : (
            <><input ref={photoInputRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={(event) => { const file = event.target.files?.[0]; if (file) void addPhoto(file); }} /><button className="mobile-trip-companion__composer-submit" type="button" disabled={pendingAction !== null} onClick={() => photoInputRef.current?.click()}>{pendingAction === "photo" ? `업로드 ${uploadProgress}%` : "카메라 또는 사진 선택"}</button><small>선택한 사진은 이 일정에 바로 저장됩니다.</small></>
          )}
        </div>
      ) : null}
      {status ? <p className="mobile-trip-companion__status" role="status" aria-live="polite">{status}</p> : null}
    </section>
  );
}

function QuickActionIcon({ name }: { name: "place" | "photo" | "note" | "more" }) {
  if (name === "place") {
    return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11Z" /><circle cx="12" cy="10" r="2" /></svg>;
  }
  if (name === "photo") {
    return <svg aria-hidden="true" viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="14" rx="2" /><circle cx="9" cy="10" r="1.7" /><path d="m5.5 17 4.3-4 2.9 2.5 2.4-2.2 3.4 3.7" /></svg>;
  }
  if (name === "note") {
    return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M5 4.5h14v15H5z" /><path d="M8 9h8M8 12.5h8M8 16h5" /></svg>;
  }
  return <svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="6" cy="12" r="1.3" /><circle cx="12" cy="12" r="1.3" /><circle cx="18" cy="12" r="1.3" /></svg>;
}

function placesForDay(places: TravelPlace[], today: string): TravelPlace[] {
  return places
    .filter((place) => place.visitedAt === today && !place.placeName.includes("장소를 골라주세요"))
    .sort((left, right) => (formatTime(left.startTime) ?? "99:99").localeCompare(formatTime(right.startTime) ?? "99:99") || left.sortOrder - right.sortOrder);
}

function findNextPlace(places: TravelPlace[]): TravelPlace | null {
  const remaining = places.filter((place) => !place.completedAt);
  if (!remaining.length) return null;
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  return remaining.find((place) => {
    const startTime = formatTime(place.startTime);
    return startTime && startTime >= currentTime;
  }) ?? remaining.at(-1) ?? null;
}

function isFuturePlace(place: TravelPlace): boolean {
  if (!place.startTime) return true;
  const now = new Date();
  return (formatTime(place.startTime) ?? "99:99") >= `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

function formatTime(value: string | null): string | null {
  return value ? value.slice(0, 5) : null;
}

function googleMapsUrl(place: TravelPlace): string {
  const query = `${place.latitude},${place.longitude} (${place.placeName})`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function differenceInDays(startDate: string, endDate: string): number {
  return Math.round((Date.parse(`${endDate}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`)) / 86_400_000);
}

function formatShortDate(value: string): string {
  const [, month, day] = value.split("-");
  return `${Number(month)}월 ${Number(day)}일`;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}분`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}시간 ${remainder}분` : `${hours}시간`;
}

function isRain(day: ForecastDay): boolean {
  return day.precipitationProbability >= 60 || (day.weatherCode >= 51 && day.weatherCode <= 67) || (day.weatherCode >= 80 && day.weatherCode <= 82) || day.weatherCode >= 95;
}

function weatherIcon(code: number): string {
  if (code >= 95) return "⛈";
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return "☂";
  if (code >= 71 && code <= 77) return "❄";
  if (code <= 1) return "☀";
  return "☁";
}

function formatTemperature(day: ForecastDay): string {
  if (day.temperatureMax == null) return "오늘 날씨";
  return `${Math.round(day.temperatureMax)}°`;
}
