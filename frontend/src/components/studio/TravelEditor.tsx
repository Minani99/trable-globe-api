"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

import { ApiError, apiMutation } from "@/lib/api/client";
import { travelPath } from "@/lib/config";
import type { CountryOption } from "@/lib/countries";
import type { TravelDetail, TravelPhotoWriteInput, TravelPlaceWriteInput, TravelWriteInput, Visibility } from "@/types";

interface PlaceDraft {
  key: string;
  countryCode: string;
  cityNameEn: string;
  cityName: string;
  placeName: string;
  latitude: string;
  longitude: string;
  visitedAt: string;
  memo: string;
}

interface PhotoDraft {
  key: string;
  imageUrl: string;
  caption: string;
  takenAt: string;
  placeIndex: string;
}

interface TravelEditorProps {
  username: string;
  countries: CountryOption[];
  initialTravel?: TravelDetail;
}

const draftKey = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export function TravelEditor({ username, countries, initialTravel }: TravelEditorProps) {
  const router = useRouter();
  const editing = Boolean(initialTravel);
  const [visibility, setVisibility] = useState<Visibility>(initialTravel?.visibility ?? "PRIVATE");
  const [places, setPlaces] = useState<PlaceDraft[]>(() =>
    initialTravel?.places.length
      ? initialTravel.places.map((place) => ({
          key: draftKey(),
          countryCode: place.country.iso2Code,
          cityNameEn: place.city?.nameEn ?? "",
          cityName: place.city?.nameKo ?? "",
          placeName: place.placeName,
          latitude: String(place.latitude),
          longitude: String(place.longitude),
          visitedAt: place.visitedAt ?? "",
          memo: place.memo ?? "",
        }))
      : [emptyPlace("KR")],
  );
  const [photos, setPhotos] = useState<PhotoDraft[]>(() =>
    initialTravel?.photos.map((photo) => ({
      key: draftKey(),
      imageUrl: photo.imageUrl,
      caption: photo.caption ?? "",
      takenAt: photo.takenAt ?? "",
      placeIndex: photo.travelPlaceId === null
        ? ""
        : String(initialTravel.places.findIndex((place) => place.id === photo.travelPlaceId)),
    })) ?? [],
  );
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const countryMap = useMemo(() => new Map(countries.map((country) => [country.iso2Code, country])), [countries]);

  function updatePlace(index: number, field: keyof PlaceDraft, value: string) {
    setPlaces((current) => current.map((place, placeIndex) =>
      placeIndex === index ? { ...place, [field]: value } : place,
    ));
  }

  function updateCityName(index: number, value: string) {
    setPlaces((current) => current.map((place, placeIndex) =>
      placeIndex === index ? { ...place, cityName: value, cityNameEn: value } : place,
    ));
  }

  function updatePhoto(index: number, field: keyof PhotoDraft, value: string) {
    setPhotos((current) => current.map((photo, photoIndex) =>
      photoIndex === index ? { ...photo, [field]: value } : photo,
    ));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setStatus(null);
    const formData = new FormData(event.currentTarget);

    try {
      const payload: TravelWriteInput = {
        title: String(formData.get("title") ?? ""),
        description: nullable(String(formData.get("description") ?? "")),
        startDate: String(formData.get("startDate") ?? ""),
        endDate: String(formData.get("endDate") ?? ""),
        coverImageUrl: nullable(String(formData.get("coverImageUrl") ?? "")),
        visibility,
        places: places.map((place) => toPlaceInput(place, countryMap)),
        photos: photos.map(toPhotoInput),
      };
      const endpoint = editing ? `/api/private/travels/${initialTravel!.id}` : "/api/private/travels";
      const result = await apiMutation<TravelDetail>(endpoint, editing ? "PUT" : "POST", payload);
      if (!result) throw new ApiError(500, "저장된 여행을 확인할 수 없습니다.");
      if (result.visibility === "PUBLIC") {
        router.push(travelPath(username, result.id));
      } else {
        router.push("/studio");
      }
      router.refresh();
    } catch (error) {
      setStatus(error instanceof ApiError ? error.message : "여행을 저장하지 못했습니다.");
      setPending(false);
    }
  }

  async function handleDelete() {
    if (!initialTravel || !window.confirm("이 여행 기록을 삭제할까요? 삭제 후에는 되돌릴 수 없습니다.")) return;
    setPending(true);
    try {
      await apiMutation<null>(`/api/private/travels/${initialTravel.id}`, "DELETE");
      router.push("/studio");
      router.refresh();
    } catch (error) {
      setStatus(error instanceof ApiError ? error.message : "여행을 삭제하지 못했습니다.");
      setPending(false);
    }
  }

  return (
    <form className="travel-editor" onSubmit={handleSubmit}>
      <section className="travel-editor__section">
        <div className="travel-editor__section-heading"><span>01</span><div><p className="eyebrow">Journey</p><h2>여행 기본 정보</h2></div></div>
        <div className="travel-editor__fields">
          <label className="is-wide"><span>여행 제목</span><input name="title" defaultValue={initialTravel?.title ?? ""} maxLength={120} placeholder="기억하고 싶은 이름을 붙여 주세요" required /></label>
          <label><span>시작일</span><input name="startDate" type="date" defaultValue={initialTravel?.startDate ?? ""} required /></label>
          <label><span>종료일</span><input name="endDate" type="date" defaultValue={initialTravel?.endDate ?? ""} required /></label>
          <label className="is-wide"><span>여행 소개</span><textarea name="description" defaultValue={initialTravel?.description ?? ""} maxLength={2000} rows={5} placeholder="이 여행을 한 문단으로 남겨 보세요." /></label>
          <label className="is-wide"><span>대표 이미지 URL</span><input name="coverImageUrl" type="url" defaultValue={initialTravel?.coverImageUrl ?? ""} placeholder="사진 업로드는 다음 단계에서 연결합니다. 지금은 이미지 주소를 붙여 넣어 주세요." /></label>
          <fieldset className="travel-editor__visibility is-wide">
            <legend>공개 범위</legend>
            <button type="button" className={visibility === "PRIVATE" ? "is-active" : ""} onClick={() => setVisibility("PRIVATE")}><strong>비공개</strong><span>작성 중인 기록은 나만 볼 수 있어요.</span></button>
            <button type="button" className={visibility === "PUBLIC" ? "is-active" : ""} onClick={() => setVisibility("PUBLIC")}><strong>공개</strong><span>내 지구본과 공개 프로필에 바로 반영됩니다.</span></button>
          </fieldset>
        </div>
      </section>

      <section className="travel-editor__section">
        <div className="travel-editor__section-heading"><span>02</span><div><p className="eyebrow">Itinerary</p><h2>방문 장소</h2><p>입력한 순서대로 상세 지도의 경로가 이어집니다.</p></div></div>
        <ol className="travel-editor__places">
          {places.map((place, index) => (
            <li key={place.key}>
              <div className="travel-editor__item-head"><strong>{String(index + 1).padStart(2, "0")}번째 장소</strong>{places.length > 1 ? <button type="button" onClick={() => setPlaces((current) => current.filter((_, i) => i !== index))}>삭제</button> : null}</div>
              <div className="travel-editor__fields">
                <label><span>나라</span><select value={place.countryCode} onChange={(event) => updatePlace(index, "countryCode", event.target.value)} required>{countries.map((country) => <option key={country.iso2Code} value={country.iso2Code}>{country.label}</option>)}</select></label>
                <label><span>도시</span><input value={place.cityName} onChange={(event) => updateCityName(index, event.target.value)} maxLength={100} placeholder="예: 서울" /></label>
                <label className="is-wide"><span>장소 이름</span><input value={place.placeName} onChange={(event) => updatePlace(index, "placeName", event.target.value)} maxLength={150} placeholder="예: 서울숲" required /></label>
                <label><span>위도</span><input value={place.latitude} onChange={(event) => updatePlace(index, "latitude", event.target.value)} type="number" min="-90" max="90" step="any" placeholder="37.544387" required /></label>
                <label><span>경도</span><input value={place.longitude} onChange={(event) => updatePlace(index, "longitude", event.target.value)} type="number" min="-180" max="180" step="any" placeholder="127.037442" required /></label>
                <label><span>방문일</span><input value={place.visitedAt} onChange={(event) => updatePlace(index, "visitedAt", event.target.value)} type="date" /></label>
                <label className="is-wide"><span>메모</span><textarea value={place.memo} onChange={(event) => updatePlace(index, "memo", event.target.value)} maxLength={1000} rows={3} placeholder="그 장소에서 기억하고 싶은 장면" /></label>
              </div>
            </li>
          ))}
        </ol>
        <div className="travel-editor__add-row"><p>지도 앱에서 장소를 길게 눌러 위도·경도를 확인할 수 있습니다.</p><button type="button" onClick={() => setPlaces((current) => [...current, emptyPlace(current.at(-1)?.countryCode ?? "KR")])}>＋ 장소 추가</button></div>
      </section>

      <section className="travel-editor__section">
        <div className="travel-editor__section-heading"><span>03</span><div><p className="eyebrow">Scenes</p><h2>사진</h2><p>지금은 외부 이미지 주소를 기록합니다. 직접 업로드는 다음 단계에서 연결합니다.</p></div></div>
        {photos.length ? (
          <ol className="travel-editor__photos">
            {photos.map((photo, index) => (
              <li key={photo.key}>
                <div className="travel-editor__item-head"><strong>사진 {String(index + 1).padStart(2, "0")}</strong><button type="button" onClick={() => setPhotos((current) => current.filter((_, i) => i !== index))}>삭제</button></div>
                <div className="travel-editor__fields">
                  <label className="is-wide"><span>이미지 URL</span><input type="url" value={photo.imageUrl} onChange={(event) => updatePhoto(index, "imageUrl", event.target.value)} required /></label>
                  <label><span>설명</span><input value={photo.caption} onChange={(event) => updatePhoto(index, "caption", event.target.value)} maxLength={300} /></label>
                  <label><span>촬영일</span><input type="date" value={photo.takenAt} onChange={(event) => updatePhoto(index, "takenAt", event.target.value)} /></label>
                  <label><span>연결할 장소</span><select value={photo.placeIndex} onChange={(event) => updatePhoto(index, "placeIndex", event.target.value)}><option value="">여행 전체</option>{places.map((place, placeIndex) => <option key={place.key} value={placeIndex}>{placeIndex + 1}. {place.placeName || "이름 없는 장소"}</option>)}</select></label>
                </div>
              </li>
            ))}
          </ol>
        ) : <div className="travel-editor__photo-empty">아직 추가한 사진이 없습니다.</div>}
        <div className="travel-editor__add-row"><span /><button type="button" onClick={() => setPhotos((current) => [...current, emptyPhoto()])}>＋ 사진 URL 추가</button></div>
      </section>

      {status ? <p className="travel-editor__error" role="alert">{status}</p> : null}
      <footer className="travel-editor__footer">
        <div>{editing ? <button type="button" className="travel-editor__delete" onClick={handleDelete} disabled={pending}>여행 삭제</button> : null}</div>
        <div><Link href={editing && initialTravel?.visibility === "PUBLIC" ? travelPath(username, initialTravel.id) : "/studio"}>취소</Link><button type="submit" disabled={pending}>{pending ? "저장 중…" : editing ? "변경 내용 저장" : "여행 기록 저장"}</button></div>
      </footer>
    </form>
  );
}

function emptyPlace(countryCode: string): PlaceDraft {
  return { key: draftKey(), countryCode, cityNameEn: "", cityName: "", placeName: "", latitude: "", longitude: "", visitedAt: "", memo: "" };
}

function emptyPhoto(): PhotoDraft {
  return { key: draftKey(), imageUrl: "", caption: "", takenAt: "", placeIndex: "" };
}

function nullable(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function toPlaceInput(place: PlaceDraft, countries: Map<string, CountryOption>): TravelPlaceWriteInput {
  const country = countries.get(place.countryCode);
  if (!country) throw new ApiError(400, "나라를 선택해 주세요.");
  const latitude = Number(place.latitude);
  const longitude = Number(place.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) throw new ApiError(400, "장소 좌표를 확인해 주세요.");
  const cityNameKo = nullable(place.cityName);
  const cityNameEn = nullable(place.cityNameEn) ?? cityNameKo;
  return {
    country: {
      iso2Code: country.iso2Code, iso3Code: country.iso3Code,
      nameEn: country.nameEn, nameKo: country.nameKo,
      latitude: country.latitude, longitude: country.longitude,
    },
    city: cityNameKo ? { nameEn: cityNameEn!, nameKo: cityNameKo, latitude, longitude } : null,
    placeName: place.placeName.trim(), latitude, longitude,
    visitedAt: nullable(place.visitedAt), memo: nullable(place.memo),
  };
}

function toPhotoInput(photo: PhotoDraft): TravelPhotoWriteInput {
  return {
    imageUrl: photo.imageUrl.trim(), caption: nullable(photo.caption), takenAt: nullable(photo.takenAt),
    placeIndex: photo.placeIndex === "" ? null : Number(photo.placeIndex),
  };
}
