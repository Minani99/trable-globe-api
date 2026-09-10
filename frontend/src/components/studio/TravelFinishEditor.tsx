"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { ApiError, apiMutation } from "@/lib/api/client";
import { travelPath } from "@/lib/config";
import { isPlaceholderPlaceName } from "@/lib/travel-placeholders";
import { useUnsavedChangesGuard } from "@/lib/useUnsavedChangesGuard";
import { formatDateRange } from "@/lib/utils/format";
import type { TravelDetail, TravelPhotoWriteInput, TravelPlaceWriteInput, TravelWriteInput, Visibility } from "@/types";

export function TravelFinishEditor({ username, travel }: { username: string; travel: TravelDetail }) {
  const router = useRouter();
  const [title, setTitle] = useState(travel.title);
  const [description, setDescription] = useState(travel.description ?? "");
  const [coverImageUrl, setCoverImageUrl] = useState(travel.coverImageUrl ?? "");
  const [captions, setCaptions] = useState(() => travel.photos.map((photo) => photo.caption ?? ""));
  const [pending, setPending] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const unresolvedPlaces = useMemo(
    () => travel.places.filter((place) => isPlaceholderPlaceName(place.placeName)),
    [travel.places],
  );
  const captionCount = captions.filter((caption) => caption.trim()).length;
  const readyItems = [unresolvedPlaces.length === 0, travel.photos.length > 0, Boolean(coverImageUrl), Boolean(description.trim())];
  const readyCount = readyItems.filter(Boolean).length;

  useUnsavedChangesGuard({
    enabled: dirty && !pending,
    message: "저장하지 않은 변경 내용이 있습니다. 이 화면을 나갈까요?",
  });

  function updateCaption(index: number, value: string) {
    setCaptions((current) => current.map((caption, captionIndex) => captionIndex === index ? value : caption));
    setDirty(true);
  }

  async function save(visibility: Visibility) {
    if (!title.trim()) {
      setStatus("여행 제목을 입력해 주세요.");
      return;
    }
    if (visibility === "PUBLIC" && unresolvedPlaces.length) {
      setStatus("아직 정하지 않은 장소를 먼저 확인해 주세요.");
      return;
    }

    setPending(true);
    setStatus(null);
    try {
      const payload: TravelWriteInput = {
        title: title.trim(),
        description: nullable(description),
        startDate: travel.startDate,
        endDate: travel.endDate,
        coverImageUrl: nullable(coverImageUrl),
        visibility,
        places: travel.places.map(toPlaceInput),
        photos: travel.photos.map((photo, index) => toPhotoInput(photo, captions[index] ?? "", travel)),
      };
      const result = await apiMutation<TravelDetail>(`/api/private/travels/${travel.id}`, "PUT", payload);
      if (!result) throw new ApiError(500, "저장된 여행을 확인할 수 없습니다.");
      setDirty(false);
      if (result.visibility === "PUBLIC") router.push(travelPath(username, result.id));
      else {
        setStatus("비공개 기록으로 저장했습니다.");
        router.refresh();
      }
    } catch (error) {
      setStatus(error instanceof ApiError ? error.message : "여행을 저장하지 못했습니다.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="travel-finish" aria-labelledby="travel-finish-heading">
      <header className="travel-finish__overview">
        <div>
          <h2 id="travel-finish-heading">여행 마무리</h2>
          <p>{formatDateRange(travel.startDate, travel.endDate)} · 장소 {travel.places.length}곳 · 사진 {travel.photos.length}장</p>
        </div>
        <div className="travel-finish__score" aria-label={`공개 준비 ${readyCount}/4`}>
          <strong>{readyCount}<small>/4</small></strong>
          <span>공개 준비</span>
        </div>
      </header>

      <ol className="travel-finish__steps" aria-label="여행 기록 마무리 순서">
        <FinishStep number="01" label="장소" complete={!unresolvedPlaces.length} optional={false} />
        <FinishStep number="02" label="사진" complete={travel.photos.length > 0} />
        <FinishStep number="03" label="대표 장면" complete={Boolean(coverImageUrl)} />
        <FinishStep number="04" label="한 줄 기록" complete={Boolean(description.trim())} />
      </ol>

      <section className="travel-finish__section" aria-labelledby="finish-story-heading">
        <div className="travel-finish__section-heading"><span>01</span><div><h3 id="finish-story-heading">제목과 한 줄 기록</h3><p>공개 프로필과 여행 상세 첫 화면에 표시됩니다.</p></div></div>
        <div className="travel-finish__fields">
          <label><span>여행 제목</span><input value={title} maxLength={120} onChange={(event) => { setTitle(event.target.value); setDirty(true); }} /></label>
          <label><span>여행 기록</span><textarea value={description} maxLength={2000} rows={4} onChange={(event) => { setDescription(event.target.value); setDirty(true); }} placeholder="가장 기억에 남는 순간을 짧게 적어보세요" /></label>
        </div>
      </section>

      <section className="travel-finish__section" aria-labelledby="finish-places-heading">
        <div className="travel-finish__section-heading"><span>02</span><div><h3 id="finish-places-heading">다녀온 장소 확인</h3><p>실제 장소만 지구본과 공개 경로에 표시됩니다.</p></div></div>
        <div className="travel-finish__place-review">
          <ol>
            {travel.places.map((place) => (
              <li key={place.id} className={isPlaceholderPlaceName(place.placeName) ? "is-unresolved" : undefined}>
                <time>{place.startTime?.slice(0, 5) ?? place.visitedAt?.slice(5).replace("-", ".") ?? "--"}</time>
                <div><strong>{place.placeName}</strong><small>{place.city?.nameKo ?? place.country.nameKo}{place.memo ? ` · ${place.memo}` : ""}</small></div>
                <span>{isPlaceholderPlaceName(place.placeName) ? "확인 필요" : "확인"}</span>
              </li>
            ))}
          </ol>
          <Link href={`/studio/travels/${travel.id}/edit?plan=1#travel-place-editor`}>{unresolvedPlaces.length ? `미정 장소 ${unresolvedPlaces.length}개 수정` : "장소 수정"} <span aria-hidden="true">→</span></Link>
        </div>
      </section>

      <section className="travel-finish__section" aria-labelledby="finish-scenes-heading">
        <div className="travel-finish__section-heading"><span>03</span><div><h3 id="finish-scenes-heading">대표 장면과 사진 설명</h3><p>사진을 눌러 대표 장면을 정하고 필요한 설명만 남기세요.</p></div></div>
        {travel.photos.length ? (
          <div className="travel-finish__scenes">
            <div className="travel-finish__scene-grid" role="radiogroup" aria-label="대표 사진 선택">
              {travel.photos.map((photo, index) => (
                <button
                  key={photo.id}
                  type="button"
                  role="radio"
                  aria-checked={coverImageUrl === photo.imageUrl}
                  className={coverImageUrl === photo.imageUrl ? "is-selected" : undefined}
                  onClick={() => { setCoverImageUrl(photo.imageUrl); setDirty(true); }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo.imageUrl} alt={photo.caption ?? `여행 사진 ${index + 1}`} />
                  <span>{coverImageUrl === photo.imageUrl ? "대표" : String(index + 1).padStart(2, "0")}</span>
                </button>
              ))}
            </div>
            <ol className="travel-finish__captions">
              {travel.photos.map((photo, index) => (
                <li key={photo.id}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <label><span className="sr-only">사진 {index + 1} 설명</span><input value={captions[index] ?? ""} maxLength={300} onChange={(event) => updateCaption(index, event.target.value)} placeholder="사진 설명 (선택)" /></label>
                </li>
              ))}
            </ol>
            <p>{captionCount}/{travel.photos.length}장에 설명이 있습니다.</p>
          </div>
        ) : (
          <div className="travel-finish__empty"><strong>아직 사진이 없어요.</strong><p>사진 없이도 공개할 수 있고, 나중에 추가해도 됩니다.</p><Link href={`/studio/travels/${travel.id}/edit?plan=1#travel-photo-editor`}>사진 추가 →</Link></div>
        )}
      </section>

      {status ? <p className="travel-finish__status" role="status" aria-live="polite">{status}</p> : null}
      <footer className="travel-finish__footer">
        <div><strong>{unresolvedPlaces.length ? "장소 확인이 필요합니다" : "공개할 준비가 됐습니다"}</strong><span>{unresolvedPlaces.length ? "미정 장소를 수정하면 공개할 수 있어요." : "저장하면 내 지구본에 바로 표시됩니다."}</span></div>
        <div><button type="button" disabled={pending} onClick={() => void save("PRIVATE")}>비공개 저장</button><button type="button" disabled={pending || unresolvedPlaces.length > 0} onClick={() => void save("PUBLIC")}>{pending ? "저장 중…" : "기록 공개"}</button></div>
      </footer>
    </section>
  );
}

function FinishStep({ number, label, complete, optional = true }: { number: string; label: string; complete: boolean; optional?: boolean }) {
  return <li className={complete ? "is-complete" : undefined}><span>{complete ? "✓" : number}</span><strong>{label}</strong><small>{complete ? "완료" : optional ? "선택" : "필수"}</small></li>;
}

function toPlaceInput(place: TravelDetail["places"][number]): TravelPlaceWriteInput {
  return {
    country: place.country,
    city: place.city ? { nameEn: place.city.nameEn, nameKo: place.city.nameKo, latitude: place.city.latitude, longitude: place.city.longitude } : null,
    placeName: place.placeName,
    latitude: place.latitude,
    longitude: place.longitude,
    visitedAt: place.visitedAt,
    startTime: place.startTime,
    durationMinutes: place.durationMinutes,
    memo: place.memo,
    completed: Boolean(place.completedAt),
  };
}

function toPhotoInput(photo: TravelDetail["photos"][number], caption: string, travel: TravelDetail): TravelPhotoWriteInput {
  const placeIndex = photo.travelPlaceId === null ? -1 : travel.places.findIndex((place) => place.id === photo.travelPlaceId);
  return { imageUrl: photo.imageUrl, caption: nullable(caption), takenAt: photo.takenAt, placeIndex: placeIndex < 0 ? null : placeIndex };
}

function nullable(value: string): string | null {
  return value.trim() || null;
}
