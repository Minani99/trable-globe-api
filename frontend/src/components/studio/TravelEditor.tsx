"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, DragEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";

import { ApiError, apiMutation } from "@/lib/api/client";
import { travelPath } from "@/lib/config";
import type { CountryOption } from "@/lib/countries";
import {
  deleteUploadedPhoto,
  getUploadConfiguration,
  type UploadConfiguration,
  uploadPhoto,
} from "@/lib/uploads/client";
import type { TravelDetail, TravelPhotoWriteInput, TravelPlaceWriteInput, TravelWriteInput, Visibility } from "@/types";
import { PlaceLocationPicker } from "@/components/studio/PlaceLocationPicker";

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
  objectKey: string | null;
  previewUrl: string | null;
  file: File | null;
  progress: number;
  uploadState: "ready" | "uploading" | "error";
  uploadError: string | null;
}

interface TravelEditorProps {
  username: string;
  countries: CountryOption[];
  initialTravel?: TravelDetail;
  initialCountryCode?: string;
  planningMode?: boolean;
}

interface StoredTravelDraft {
  version: 1;
  savedAt: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  coverImageUrl: string;
  visibility: Visibility;
  places: PlaceDraft[];
  photos: Array<Omit<PhotoDraft, "previewUrl" | "file" | "progress" | "uploadState" | "uploadError">>;
}

const draftKey = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export function TravelEditor({
  username,
  countries,
  initialTravel,
  initialCountryCode = "KR",
  planningMode = false,
}: TravelEditorProps) {
  const router = useRouter();
  const editing = Boolean(initialTravel);
  const draftStorageKey = `travel-globe:draft:${username}:${initialTravel?.id ?? "new"}`;
  const draftReady = useRef(false);
  const [title, setTitle] = useState(initialTravel?.title ?? "");
  const [description, setDescription] = useState(initialTravel?.description ?? "");
  const [startDate, setStartDate] = useState(initialTravel?.startDate ?? "");
  const [endDate, setEndDate] = useState(initialTravel?.endDate ?? "");
  const [visibility, setVisibility] = useState<Visibility>(initialTravel?.visibility ?? "PRIVATE");
  const [coverImageUrl, setCoverImageUrl] = useState(initialTravel?.coverImageUrl ?? "");
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
      : [emptyPlace(initialCountryCode)],
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
      objectKey: null,
      previewUrl: null,
      file: null,
      progress: 100,
      uploadState: "ready" as const,
      uploadError: null,
    })) ?? [],
  );
  const [uploadConfig, setUploadConfig] = useState<UploadConfiguration | null>(null);
  const [removedPhotoUrls, setRemovedPhotoUrls] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [draftHydrated, setDraftHydrated] = useState(false);
  const [draftStatus, setDraftStatus] = useState("변경 내용은 이 브라우저에 자동 저장됩니다.");
  const [draftRestored, setDraftRestored] = useState(false);
  const countryMap = useMemo(() => new Map(countries.map((country) => [country.iso2Code, country])), [countries]);

  useEffect(() => {
    let active = true;
    getUploadConfiguration()
      .then((configuration) => {
        if (active) setUploadConfig(configuration);
      })
      .catch(() => {
        if (active) setUploadConfig({ configured: false, maxBytes: 10 * 1024 * 1024, maxPhotos: 30, acceptedTypes: ["image/jpeg", "image/png", "image/webp"] });
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const raw = window.localStorage.getItem(draftStorageKey);
        if (raw) {
          const draft = JSON.parse(raw) as StoredTravelDraft;
          if (draft.version === 1 && Array.isArray(draft.places) && Array.isArray(draft.photos)) {
            setTitle(draft.title);
            setDescription(draft.description);
            setStartDate(draft.startDate);
            setEndDate(draft.endDate);
            setCoverImageUrl(draft.coverImageUrl);
            setVisibility(draft.visibility);
            setPlaces(draft.places);
            setPhotos(draft.photos.map((photo) => ({
              ...photo,
              previewUrl: null,
              file: null,
              progress: 100,
              uploadState: "ready",
              uploadError: null,
            })));
            setDraftStatus(`이 브라우저에 남아 있던 임시 저장본을 복구했습니다. · ${formatDraftTime(draft.savedAt)}`);
            setDraftRestored(true);
            setDirty(true);
          }
        }
      } catch {
        window.localStorage.removeItem(draftStorageKey);
      } finally {
        draftReady.current = true;
        setDraftHydrated(true);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [draftStorageKey]);

  useEffect(() => {
    if (!draftReady.current || !dirty || pending) return;
    const timer = window.setTimeout(() => {
      const savedAt = new Date().toISOString();
      const draft: StoredTravelDraft = {
        version: 1,
        savedAt,
        title,
        description,
        startDate,
        endDate,
        coverImageUrl,
        visibility,
        places,
        photos: photos
          .filter((photo) => photo.uploadState !== "uploading")
          .map(toStoredPhoto),
      };
      window.localStorage.setItem(draftStorageKey, JSON.stringify(draft));
      setDraftStatus(`임시 저장됨 · ${formatDraftTime(savedAt)}`);
    }, 800);
    return () => window.clearTimeout(timer);
  }, [coverImageUrl, description, dirty, draftStorageKey, endDate, pending, photos, places, startDate, title, visibility]);

  useEffect(() => {
    if (!dirty || pending) return;
    const warnBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    const warnBeforeLink = (event: MouseEvent) => {
      const target = event.target as Element | null;
      const link = target?.closest("a");
      if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
      const href = link.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      if (!window.confirm("아직 서버에 저장하지 않은 변경 내용이 있습니다. 페이지를 떠날까요? 임시 저장본은 이 브라우저에 남습니다.")) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      setDirty(false);
    };
    window.addEventListener("beforeunload", warnBeforeUnload);
    document.addEventListener("click", warnBeforeLink, true);
    return () => {
      window.removeEventListener("beforeunload", warnBeforeUnload);
      document.removeEventListener("click", warnBeforeLink, true);
    };
  }, [dirty, pending]);

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

  function updateCountry(index: number, countryCode: string) {
    setPlaces((current) => current.map((place, placeIndex) =>
      placeIndex === index
        ? { ...place, countryCode, cityName: "", cityNameEn: "", placeName: "", latitude: "", longitude: "" }
        : place,
    ));
  }

  function updateLocation(
    index: number,
    location: { name: string; city: string; latitude: number; longitude: number },
  ) {
    setPlaces((current) => current.map((place, placeIndex) => {
      if (placeIndex !== index) return place;
      const cityName = location.city.trim();
      const placeName = location.name.trim();
      return {
        ...place,
        cityName: cityName || place.cityName,
        cityNameEn: cityName || place.cityNameEn,
        placeName: placeName || place.placeName,
        latitude: location.latitude.toFixed(6),
        longitude: location.longitude.toFixed(6),
      };
    }));
    setDirty(true);
  }

  function movePlace(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= places.length) return;
    setPlaces((current) => {
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
    setPhotos((current) => current.map((photo) => {
      if (photo.placeIndex === String(index)) return { ...photo, placeIndex: String(nextIndex) };
      if (photo.placeIndex === String(nextIndex)) return { ...photo, placeIndex: String(index) };
      return photo;
    }));
    setDirty(true);
  }

  function removePlace(index: number) {
    setPlaces((current) => current.filter((_, placeIndex) => placeIndex !== index));
    setPhotos((current) => current.map((photo) => {
      if (photo.placeIndex === "") return photo;
      const placeIndex = Number(photo.placeIndex);
      if (placeIndex === index) return { ...photo, placeIndex: "" };
      return placeIndex > index ? { ...photo, placeIndex: String(placeIndex - 1) } : photo;
    }));
    setDirty(true);
  }

  function updatePhoto(index: number, changes: Partial<PhotoDraft>) {
    setPhotos((current) => current.map((photo, photoIndex) =>
      photoIndex === index ? { ...photo, ...changes } : photo,
    ));
  }

  function movePhoto(index: number, direction: -1 | 1) {
    setPhotos((current) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
    setDirty(true);
  }

  function removePhoto(index: number) {
    const photo = photos[index];
    if (!photo) return;
    if (photo.previewUrl) URL.revokeObjectURL(photo.previewUrl);
    if (photo.objectKey) void deleteUploadedPhoto({ objectKey: photo.objectKey }).catch(() => undefined);
    else if (photo.imageUrl) setRemovedPhotoUrls((current) => [...current, photo.imageUrl]);
    if (coverImageUrl === photo.imageUrl) setCoverImageUrl("");
    setPhotos((current) => current.filter((_, photoIndex) => photoIndex !== index));
    setDirty(true);
  }

  async function uploadDraft(key: string, file: File, previewUrl: string) {
    try {
      const uploaded = await uploadPhoto(file, (progress) => {
        setPhotos((current) => current.map((photo) => photo.key === key ? { ...photo, progress } : photo));
      });
      URL.revokeObjectURL(previewUrl);
      setPhotos((current) => current.map((photo) => photo.key === key
        ? {
            ...photo,
            imageUrl: uploaded.publicUrl,
            objectKey: uploaded.objectKey,
            previewUrl: null,
            file: null,
            progress: 100,
            uploadState: "ready",
            uploadError: null,
          }
        : photo));
    } catch (error) {
      setPhotos((current) => current.map((photo) => photo.key === key
        ? {
            ...photo,
            progress: 0,
            uploadState: "error",
            uploadError: error instanceof ApiError ? error.message : "사진을 업로드하지 못했습니다.",
          }
        : photo));
    }
  }

  function addPhotoFiles(files: File[]) {
    if (!files.length) return;
    const configuration = uploadConfig;
    if (!configuration?.configured) {
      setStatus("사진 저장소가 아직 연결되지 않았습니다. 아래의 이미지 URL 방식은 계속 사용할 수 있어요.");
      return;
    }
    if (photos.length + files.length > configuration.maxPhotos) {
      setStatus(`사진은 여행 한 건에 최대 ${configuration.maxPhotos}장까지 올릴 수 있습니다.`);
      return;
    }
    const invalid = files.find((file) => !configuration.acceptedTypes.includes(file.type) || file.size > configuration.maxBytes);
    if (invalid) {
      setStatus("JPG, PNG, WebP 형식의 10MB 이하 사진만 올릴 수 있습니다.");
      return;
    }
    setStatus(null);
    const drafts = files.map((file) => {
      const previewUrl = URL.createObjectURL(file);
      return {
        ...emptyPhoto(),
        key: draftKey(),
        previewUrl,
        file,
        uploadState: "uploading" as const,
      };
    });
    setPhotos((current) => [...current, ...drafts]);
    setDirty(true);
    drafts.forEach((draft) => void uploadDraft(draft.key, draft.file!, draft.previewUrl!));
  }

  function handlePhotoFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    addPhotoFiles(files);
  }

  function handlePhotoDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    if (!uploadConfig?.configured || pending) return;
    addPhotoFiles(Array.from(event.dataTransfer.files));
  }

  function retryPhoto(photo: PhotoDraft) {
    if (!photo.file || !photo.previewUrl) return;
    setPhotos((current) => current.map((item) => item.key === photo.key
      ? { ...item, progress: 0, uploadState: "uploading", uploadError: null }
      : item));
    void uploadDraft(photo.key, photo.file, photo.previewUrl);
  }

  async function discardDraft() {
    await Promise.allSettled(photos
      .filter((photo) => photo.objectKey)
      .map((photo) => deleteUploadedPhoto({ objectKey: photo.objectKey })));
    window.localStorage.removeItem(draftStorageKey);
    setDirty(false);
    window.location.reload();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setStatus(null);
    const formData = new FormData(event.currentTarget);

    try {
      if (photos.some((photo) => photo.uploadState === "uploading")) {
        throw new ApiError(400, "사진 업로드가 끝난 뒤 저장해 주세요.");
      }
      if (photos.some((photo) => photo.uploadState === "error" || !photo.imageUrl.trim())) {
        throw new ApiError(400, "업로드하지 못한 사진을 다시 시도하거나 삭제해 주세요.");
      }
      const payload: TravelWriteInput = {
        title: String(formData.get("title") ?? ""),
        description: nullable(String(formData.get("description") ?? "")),
        startDate: String(formData.get("startDate") ?? ""),
        endDate: String(formData.get("endDate") ?? ""),
        coverImageUrl: nullable(coverImageUrl),
        visibility,
        places: places.map((place) => toPlaceInput(place, countryMap)),
        photos: photos.map(toPhotoInput),
      };
      const endpoint = editing ? `/api/private/travels/${initialTravel!.id}` : "/api/private/travels";
      const result = await apiMutation<TravelDetail>(endpoint, editing ? "PUT" : "POST", payload);
      if (!result) throw new ApiError(500, "저장된 여행을 확인할 수 없습니다.");
      await Promise.allSettled(removedPhotoUrls.map((publicUrl) => deleteUploadedPhoto({ publicUrl })));
      window.localStorage.removeItem(draftStorageKey);
      setDirty(false);
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
    if (!initialTravel || !window.confirm(`${planningMode ? "이 여행 계획" : "이 여행 기록"}을 삭제할까요? 삭제 후에는 되돌릴 수 없습니다.`)) return;
    setPending(true);
    try {
      await apiMutation<null>(`/api/private/travels/${initialTravel.id}`, "DELETE");
      const storedUrls = [initialTravel.coverImageUrl, ...initialTravel.photos.map((photo) => photo.imageUrl)]
        .filter((url): url is string => Boolean(url));
      await Promise.allSettled([...new Set(storedUrls)].map((publicUrl) => deleteUploadedPhoto({ publicUrl })));
      window.localStorage.removeItem(draftStorageKey);
      setDirty(false);
      router.push("/studio");
      router.refresh();
    } catch (error) {
      setStatus(error instanceof ApiError ? error.message : "여행을 삭제하지 못했습니다.");
      setPending(false);
    }
  }

  return (
    <form className={`travel-editor${draftHydrated ? "" : " is-restoring"}`} onSubmit={handleSubmit} onChange={() => setDirty(true)} aria-busy={!draftHydrated}>
      <section className="travel-editor__section">
        <div className="travel-editor__section-heading"><span>01</span><div><p className="eyebrow">Journey</p><h2>{planningMode ? "계획 기본 정보" : "여행 기본 정보"}</h2></div></div>
        <div className="travel-editor__fields">
          <label className="is-wide"><span>여행 제목</span><input name="title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} placeholder={planningMode ? "다음 여행의 이름" : "기억하고 싶은 이름을 붙여 주세요"} required /></label>
          <label><span>시작일</span><input name="startDate" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} required /></label>
          <label><span>종료일</span><input name="endDate" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} required /></label>
          <label className="is-wide"><span>{planningMode ? "이번 여행의 방향" : "여행 소개"}</span><textarea name="description" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={2000} rows={5} placeholder={planningMode ? "하고 싶은 것과 여행 분위기를 적어두세요." : "이 여행을 한 문단으로 남겨 보세요."} /></label>
          <div className="travel-editor__cover is-wide">
            <div>
              <span>대표 사진</span>
              <p>아래에 올린 사진에서 대표로 지정하면 여행 목록과 상세 화면에 먼저 보여요.</p>
            </div>
            {coverImageUrl ? (
              <div className="travel-editor__cover-preview">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={coverImageUrl} alt="현재 대표 사진" />
                <button type="button" onClick={() => { setCoverImageUrl(""); setDirty(true); }}>대표 사진 해제</button>
              </div>
            ) : <div className="travel-editor__cover-empty">아직 대표 사진을 정하지 않았어요.</div>}
            <details className="travel-editor__url-option">
              <summary>외부 이미지 주소 사용</summary>
              <input type="url" value={coverImageUrl} onChange={(event) => setCoverImageUrl(event.target.value)} placeholder="https://…" />
            </details>
          </div>
          <fieldset className="travel-editor__visibility is-wide">
            <legend>{planningMode ? "여행 상태" : "공개 범위"}</legend>
            <button type="button" className={visibility === "PRIVATE" ? "is-active" : ""} onClick={() => { setVisibility("PRIVATE"); setDirty(true); }}><strong>{planningMode ? "계획 중" : "비공개"}</strong><span>{planningMode ? "나만 보며 일정을 계속 다듬어요." : "작성 중인 기록은 나만 볼 수 있어요."}</span></button>
            <button type="button" className={visibility === "PUBLIC" ? "is-active" : ""} onClick={() => { setVisibility("PUBLIC"); setDirty(true); }}><strong>{planningMode ? "다녀왔어요 · 기록 공개" : "공개"}</strong><span>{planningMode ? "계획을 완료된 여행 기록으로 바꿔 지구본에 남겨요." : "내 지구본과 공개 프로필에 바로 반영됩니다."}</span></button>
          </fieldset>
        </div>
      </section>

      <section className="travel-editor__section">
        <div className="travel-editor__section-heading"><span>02</span><div><p className="eyebrow">Itinerary</p><h2>{planningMode ? "일차별 일정" : "방문 장소"}</h2><p>{planningMode ? "자동으로 만든 일차별 카드를 실제 가고 싶은 장소로 바꿔보세요." : "입력한 순서대로 상세 지도의 경로가 이어집니다."}</p></div></div>
        <ol className="travel-editor__places">
          {places.map((place, index) => (
            <li key={place.key}>
              <div className="travel-editor__item-head">
                <strong>{planningMode && place.visitedAt ? `${place.visitedAt.slice(5).replace("-", ".")} 일정` : `${String(index + 1).padStart(2, "0")}번째 장소`}</strong>
                <div className="travel-editor__order-actions">
                  <button type="button" onClick={() => movePlace(index, -1)} disabled={index === 0 || pending} aria-label="장소를 앞으로 이동">↑</button>
                  <button type="button" onClick={() => movePlace(index, 1)} disabled={index === places.length - 1 || pending} aria-label="장소를 뒤로 이동">↓</button>
                  {places.length > 1 ? <button type="button" className="is-danger" onClick={() => removePlace(index)}>삭제</button> : null}
                </div>
              </div>
              <div className="travel-editor__fields">
                <label><span>나라</span><select value={place.countryCode} onChange={(event) => updateCountry(index, event.target.value)} required>{countries.map((country) => <option key={country.iso2Code} value={country.iso2Code}>{country.label}</option>)}</select></label>
                <PlaceLocationPicker
                  key={place.countryCode}
                  countryCode={place.countryCode}
                  countryName={countryMap.get(place.countryCode)?.nameKo ?? "선택한 나라"}
                  fallbackLatitude={countryMap.get(place.countryCode)?.latitude ?? 36.5}
                  fallbackLongitude={countryMap.get(place.countryCode)?.longitude ?? 127.8}
                  latitude={coordinate(place.latitude)}
                  longitude={coordinate(place.longitude)}
                  onSelect={(location) => updateLocation(index, location)}
                />
                <label><span>도시</span><input value={place.cityName} onChange={(event) => updateCityName(index, event.target.value)} maxLength={100} placeholder="예: 서울" /></label>
                <label className="is-wide"><span>장소 이름</span><input value={place.placeName} onChange={(event) => updatePlace(index, "placeName", event.target.value)} maxLength={150} placeholder="예: 서울숲" required /></label>
                <label><span>방문일</span><input value={place.visitedAt} onChange={(event) => updatePlace(index, "visitedAt", event.target.value)} type="date" /></label>
                <label className="is-wide"><span>메모</span><textarea value={place.memo} onChange={(event) => updatePlace(index, "memo", event.target.value)} maxLength={1000} rows={3} placeholder={planningMode ? "예약, 먹고 싶은 메뉴, 이동 팁" : "그 장소에서 기억하고 싶은 장면"} /></label>
              </div>
            </li>
          ))}
        </ol>
        <div className="travel-editor__add-row"><p>{planningMode ? "실제로 갈 순서대로 장소를 추가하고 위아래로 옮겨보세요." : "추가한 순서대로 상세 지도의 여행 경로가 이어집니다."}</p><button type="button" onClick={() => { setPlaces((current) => [...current, emptyPlace(current.at(-1)?.countryCode ?? "KR")]); setDirty(true); }}>＋ 장소 추가</button></div>
      </section>

      <section className="travel-editor__section">
        <div className="travel-editor__section-heading"><span>03</span><div><p className="eyebrow">Scenes</p><h2>여행 사진</h2><p>사진을 바로 올리고, 순서를 정하고, 방문 장소와 연결해 보세요.</p></div></div>
        <label
          className={`travel-editor__dropzone${uploadConfig?.configured ? " is-ready" : ""}`}
          onDragOver={(event) => event.preventDefault()}
          onDrop={handlePhotoDrop}
        >
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={handlePhotoFiles}
            disabled={!uploadConfig?.configured || pending}
          />
          <span className="travel-editor__dropzone-icon" aria-hidden="true">＋</span>
          <strong>{uploadConfig === null ? "사진 업로드 준비를 확인하고 있어요" : uploadConfig.configured ? "사진을 선택하거나 이곳에 놓아 주세요" : "사진 저장소 연결이 필요해요"}</strong>
          <small>{uploadConfig?.configured ? `JPG · PNG · WebP / 장당 최대 ${Math.round(uploadConfig.maxBytes / 1024 / 1024)}MB / 최대 ${uploadConfig.maxPhotos}장` : "연결 전까지는 아래의 외부 이미지 주소 방식을 사용할 수 있어요."}</small>
        </label>
        {photos.length ? (
          <ol className="travel-editor__photos">
            {photos.map((photo, index) => (
              <li key={photo.key}>
                <div className="travel-editor__photo-preview">
                  {photo.previewUrl || photo.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photo.previewUrl || photo.imageUrl} alt={photo.caption || `여행 사진 ${index + 1}`} />
                  ) : <span>이미지 주소를 입력해 주세요.</span>}
                  {photo.uploadState === "uploading" ? (
                    <div className="travel-editor__upload-progress">
                      <span style={{ width: `${photo.progress}%` }} />
                      <strong>{photo.progress}%</strong>
                    </div>
                  ) : null}
                </div>
                <div className="travel-editor__item-head">
                  <strong>사진 {String(index + 1).padStart(2, "0")}</strong>
                  <div className="travel-editor__photo-actions">
                    <button type="button" onClick={() => movePhoto(index, -1)} disabled={index === 0 || pending} aria-label="사진을 앞으로 이동">↑</button>
                    <button type="button" onClick={() => movePhoto(index, 1)} disabled={index === photos.length - 1 || pending} aria-label="사진을 뒤로 이동">↓</button>
                    {photo.imageUrl ? <button type="button" className={coverImageUrl === photo.imageUrl ? "is-cover" : ""} onClick={() => { setCoverImageUrl(photo.imageUrl); setDirty(true); }}>{coverImageUrl === photo.imageUrl ? "대표 사진" : "대표로 지정"}</button> : null}
                    <button type="button" onClick={() => removePhoto(index)} disabled={pending}>삭제</button>
                  </div>
                </div>
                {photo.uploadState === "error" ? (
                  <p className="travel-editor__upload-error" role="alert">{photo.uploadError}<button type="button" onClick={() => retryPhoto(photo)}>다시 시도</button></p>
                ) : null}
                <div className="travel-editor__fields">
                  <label><span>한 줄 설명</span><input value={photo.caption} onChange={(event) => updatePhoto(index, { caption: event.target.value })} maxLength={300} placeholder="이 장면을 기억할 짧은 문장" /></label>
                  <label><span>촬영일</span><input type="date" value={photo.takenAt} onChange={(event) => updatePhoto(index, { takenAt: event.target.value })} /></label>
                  <label><span>연결할 장소</span><select value={photo.placeIndex} onChange={(event) => updatePhoto(index, { placeIndex: event.target.value })}><option value="">여행 전체</option>{places.map((place, placeIndex) => <option key={place.key} value={placeIndex}>{placeIndex + 1}. {place.placeName || "이름 없는 장소"}</option>)}</select></label>
                  <details className="travel-editor__url-option is-wide">
                    <summary>외부 이미지 주소 수정</summary>
                    <input type="url" value={photo.imageUrl} onChange={(event) => updatePhoto(index, { imageUrl: event.target.value, uploadState: "ready", uploadError: null })} placeholder="https://…" required />
                  </details>
                </div>
              </li>
            ))}
          </ol>
        ) : <div className="travel-editor__photo-empty">첫 사진을 올리면 여행의 장면이 이곳에 차곡차곡 쌓입니다.</div>}
        <div className="travel-editor__add-row"><p>다른 사이트에 이미 올린 사진이라면 주소로도 추가할 수 있어요.</p><button type="button" onClick={() => { setPhotos((current) => [...current, emptyPhoto()]); setDirty(true); }}>＋ 이미지 주소로 추가</button></div>
      </section>

      {status ? <p className="travel-editor__error" role="alert">{status}</p> : null}
      <footer className="travel-editor__footer">
        <div className="travel-editor__draft-state">
          {editing ? <button type="button" className="travel-editor__delete" onClick={handleDelete} disabled={pending}>{planningMode ? "계획 삭제" : "여행 삭제"}</button> : null}
          <span aria-live="polite">{draftStatus}</span>
          {draftRestored ? <button type="button" onClick={discardDraft} disabled={pending}>임시 저장본 버리기</button> : null}
        </div>
        <div><Link href={editing && initialTravel?.visibility === "PUBLIC" ? travelPath(username, initialTravel.id) : "/studio"}>취소</Link><button type="submit" disabled={pending}>{pending ? "저장 중…" : planningMode && visibility === "PUBLIC" ? "기록으로 전환하기" : planningMode ? "계획 저장" : editing ? "변경 내용 저장" : "여행 기록 저장"}</button></div>
      </footer>
    </form>
  );
}

function emptyPlace(countryCode: string): PlaceDraft {
  return { key: draftKey(), countryCode, cityNameEn: "", cityName: "", placeName: "", latitude: "", longitude: "", visitedAt: "", memo: "" };
}

function emptyPhoto(): PhotoDraft {
  return {
    key: draftKey(), imageUrl: "", caption: "", takenAt: "", placeIndex: "",
    objectKey: null, previewUrl: null, file: null, progress: 0, uploadState: "ready", uploadError: null,
  };
}

function toStoredPhoto(photo: PhotoDraft): StoredTravelDraft["photos"][number] {
  return {
    key: photo.key,
    imageUrl: photo.imageUrl,
    caption: photo.caption,
    takenAt: photo.takenAt,
    placeIndex: photo.placeIndex,
    objectKey: photo.objectKey,
  };
}

function formatDraftTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "방금";
  return new Intl.DateTimeFormat("ko-KR", { hour: "2-digit", minute: "2-digit" }).format(date);
}

function nullable(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function coordinate(value: string): number | null {
  const parsed = Number(value);
  return value.trim() && Number.isFinite(parsed) ? parsed : null;
}

function toPlaceInput(place: PlaceDraft, countries: Map<string, CountryOption>): TravelPlaceWriteInput {
  const country = countries.get(place.countryCode);
  if (!country) throw new ApiError(400, "나라를 선택해 주세요.");
  if (!place.latitude.trim() || !place.longitude.trim()) {
    throw new ApiError(400, "장소를 검색하거나 지도에서 방문 위치를 선택해 주세요.");
  }
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
