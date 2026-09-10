"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChangeEvent, DragEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { TravelActionIcon } from "@/components/common/TravelActionIcon";
import { ApiError, apiMutation } from "@/lib/api/client";
import { travelPath } from "@/lib/config";
import type { CountryOption } from "@/lib/countries";
import {
  deleteUploadedPhoto,
  getUploadConfiguration,
  MAX_SOURCE_IMAGE_BYTES,
  type UploadConfiguration,
  uploadPhoto,
} from "@/lib/uploads/client";
import { readPhotoMetadata, type PhotoMetadata } from "@/lib/uploads/photo-metadata";
import { isPlaceholderPlaceName } from "@/lib/travel-placeholders";
import { useUnsavedChangesGuard } from "@/lib/useUnsavedChangesGuard";
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
  startTime: string;
  durationMinutes: string;
  memo: string;
  completed: boolean;
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
  today?: string;
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

interface WeatherForecastDay {
  date: string;
  weatherCode: number;
  precipitationProbability: number;
}

interface WeatherReplanProposal {
  rainyDate: string;
  sourceSignature: string;
  afterPlaces: PlaceDraft[];
  title: string;
  reason: string;
  changes: Array<{ date: string; before: string; after: string }>;
}

interface WeatherUndoSnapshot {
  places: PlaceDraft[];
  appliedSignature: string;
}

const draftKey = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const PLAN_SLOT_PRESETS = ["관광", "식사", "카페", "숙소"] as const;
const MOBILE_EDITOR_STEPS = ["기본 정보", "일정과 장소", "사진과 공개"] as const;

export function TravelEditor({
  username,
  countries,
  initialTravel,
  initialCountryCode = "KR",
  planningMode = false,
  today = "",
}: TravelEditorProps) {
  const router = useRouter();
  const requestedDate = useSearchParams().get("date");
  const editing = Boolean(initialTravel);
  const draftStorageKey = `travel-globe:draft:${username}:${initialTravel?.id ?? "new"}`;
  const draftReady = useRef(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const weatherAutoCheckKey = useRef<string | null>(null);
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
          startTime: place.startTime?.slice(0, 5) ?? "",
          durationMinutes: place.durationMinutes ? String(place.durationMinutes) : "",
          memo: place.memo ?? "",
          completed: Boolean(place.completedAt),
        }))
      : [emptyPlace(initialCountryCode)],
  );
  const [activePlanDate, setActivePlanDate] = useState(() => {
    if (requestedDate && /^\d{4}-\d{2}-\d{2}$/.test(requestedDate)
      && initialTravel && requestedDate >= initialTravel.startDate && requestedDate <= initialTravel.endDate) return requestedDate;
    if (planningMode && today && initialTravel?.startDate && initialTravel.endDate
      && initialTravel.startDate <= today && today <= initialTravel.endDate) {
      return today;
    }
    return initialTravel?.places.find((place) => place.visitedAt)?.visitedAt ?? initialTravel?.startDate ?? "";
  });
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
  const [photoImporting, setPhotoImporting] = useState(false);
  const [photoImportNotice, setPhotoImportNotice] = useState<string | null>(null);
  const [removedPhotoUrls, setRemovedPhotoUrls] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [draftHydrated, setDraftHydrated] = useState(false);
  const [draftStatus, setDraftStatus] = useState("변경 내용은 이 브라우저에 자동 저장됩니다.");
  const [draftRestored, setDraftRestored] = useState(false);
  const [weatherProposal, setWeatherProposal] = useState<WeatherReplanProposal | null>(null);
  const [weatherUndo, setWeatherUndo] = useState<WeatherUndoSnapshot | null>(null);
  const [weatherPlannerState, setWeatherPlannerState] = useState<"idle" | "loading" | "message">("idle");
  const [weatherPlannerMessage, setWeatherPlannerMessage] = useState<string | null>(null);
  const [scheduleView, setScheduleView] = useState<"simple" | "timeline">(
    initialTravel?.places.some((place) => Boolean(place.startTime)) ? "timeline" : "simple",
  );
  const [mobileEditorStep, setMobileEditorStep] = useState(0);
  const [activeQuickAction, setActiveQuickAction] = useState<"place" | "photo" | "note" | null>(null);
  const countryMap = useMemo(() => new Map(countries.map((country) => [country.iso2Code, country])), [countries]);
  const travelPreferences = useMemo(() => recommendationPreferences(`${title} ${description}`), [description, title]);
  const planDays = useMemo(() => {
    if (!planningMode) return [];
    const scheduledDays = datesBetween(startDate, endDate);
    const placeDays = places.map((place) => place.visitedAt).filter(Boolean);
    return [...new Set([...scheduledDays, ...placeDays])].sort();
  }, [endDate, places, planningMode, startDate]);
  const activeDayPlaces = planningMode
    ? places.map((place, index) => ({ place, index })).filter(({ place }) => place.visitedAt === activePlanDate)
    : [];
  const quickNoteIndex = planningMode ? (activeDayPlaces[0]?.index ?? 0) : 0;
  const completedPlanDays = planDays.filter((day) =>
    places.some((place) => place.visitedAt === day && !isPlanningPlaceholder(place)),
  ).length;
  const placeholderCount = places.filter(isPlanningPlaceholder).length;
  const tripFinished = Boolean(today && endDate && endDate <= today);
  const conversionReady = planningMode && tripFinished && placeholderCount === 0;
  const travelActive = Boolean(today && startDate && endDate && startDate <= today && today <= endDate);

  useEffect(() => {
    if (!planningMode || planDays.length === 0) return;
    if (!activePlanDate || !planDays.includes(activePlanDate)) setActivePlanDate(planDays[0]);
  }, [activePlanDate, planDays, planningMode]);

  useEffect(() => {
    const syncStepWithHash = () => {
      if (window.location.hash.startsWith("#travel-photo-editor")) setMobileEditorStep(2);
      else if (["#travel-place-editor", "#travel-note-editor", "#itinerary-editor"].some((hash) => window.location.hash.startsWith(hash))) setMobileEditorStep(1);
    };
    syncStepWithHash();
    window.addEventListener("hashchange", syncStepWithHash);
    return () => window.removeEventListener("hashchange", syncStepWithHash);
  }, []);

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

  useUnsavedChangesGuard({
    enabled: dirty && !pending,
    message: "아직 서버에 저장하지 않은 변경 내용이 있습니다. 페이지를 떠날까요? 임시 저장본은 이 브라우저에 남습니다.",
    onLeave: () => setDirty(false),
  });

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

  function movePlanningPlace(index: number, direction: -1 | 1) {
    const siblingIndexes = places
      .map((place, placeIndex) => ({ place, placeIndex }))
      .filter(({ place }) => place.visitedAt === activePlanDate)
      .map(({ placeIndex }) => placeIndex);
    const siblingIndex = siblingIndexes.indexOf(index);
    const targetIndex = siblingIndexes[siblingIndex + direction];
    if (targetIndex === undefined) return;
    setPlaces((current) => {
      const next = [...current];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
    setPhotos((current) => current.map((photo) => {
      if (photo.placeIndex === String(index)) return { ...photo, placeIndex: String(targetIndex) };
      if (photo.placeIndex === String(targetIndex)) return { ...photo, placeIndex: String(index) };
      return photo;
    }));
    setDirty(true);
  }

  function addPlanningPlace(slot: (typeof PLAN_SLOT_PRESETS)[number]) {
    if (!activePlanDate) return;
    const countryCode = activeDayPlaces[0]?.place.countryCode
      ?? places[0]?.countryCode
      ?? initialCountryCode;
    const country = countryMap.get(countryCode);
    const insertionIndex = planDayInsertionIndex(places, activePlanDate);
    const nextPlace: PlaceDraft = {
      ...emptyPlace(countryCode),
      placeName: `${slot} · 장소를 골라주세요`,
      latitude: country ? String(country.latitude) : "",
      longitude: country ? String(country.longitude) : "",
      visitedAt: activePlanDate,
      startTime: nextPlanningTime(activeDayPlaces.map(({ place }) => place.startTime), slot),
      durationMinutes: slot === "숙소" ? "60" : slot === "식사" ? "75" : "90",
    };
    setPlaces((current) => {
      const next = [...current];
      next.splice(insertionIndex, 0, nextPlace);
      return next;
    });
    setPhotos((current) => current.map((photo) => {
      if (photo.placeIndex === "" || Number(photo.placeIndex) < insertionIndex) return photo;
      return { ...photo, placeIndex: String(Number(photo.placeIndex) + 1) };
    }));
    setDirty(true);
  }

  function copyPreviousPlanDay() {
    const activeDayIndex = planDays.indexOf(activePlanDate);
    const previousDay = planDays[activeDayIndex - 1];
    if (!previousDay) return;
    const previousPlaces = places.filter(
      (place) => place.visitedAt === previousDay && !isPlanningPlaceholder(place),
    );
    if (previousPlaces.length === 0) return;
    const copies = previousPlaces.map((place) => ({ ...place, key: draftKey(), visitedAt: activePlanDate }));
    const placeholderIndex = places.findIndex(
      (place) => place.visitedAt === activePlanDate && isPlanningPlaceholder(place),
    );
    if (placeholderIndex >= 0) {
      setPlaces((current) => {
        const next = [...current];
        next.splice(placeholderIndex, 1, ...copies);
        return next;
      });
      const addedCount = copies.length - 1;
      if (addedCount > 0) {
        setPhotos((current) => current.map((photo) => {
          if (photo.placeIndex === "" || Number(photo.placeIndex) <= placeholderIndex) return photo;
          return { ...photo, placeIndex: String(Number(photo.placeIndex) + addedCount) };
        }));
      }
    } else {
      const insertionIndex = planDayInsertionIndex(places, activePlanDate);
      setPlaces((current) => {
        const next = [...current];
        next.splice(insertionIndex, 0, ...copies);
        return next;
      });
      setPhotos((current) => current.map((photo) => {
        if (photo.placeIndex === "" || Number(photo.placeIndex) < insertionIndex) return photo;
        return { ...photo, placeIndex: String(Number(photo.placeIndex) + copies.length) };
      }));
    }
    setDirty(true);
  }

  const buildWeatherReplanProposal = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    const anchor = places.find((place) => coordinate(place.latitude) !== null && coordinate(place.longitude) !== null);
    if (!anchor || !startDate || !endDate) {
      if (!silent) {
        setWeatherPlannerState("message");
        setWeatherPlannerMessage("장소 위치와 여행 날짜를 먼저 확인해 주세요.");
      }
      return;
    }

    setWeatherPlannerState("loading");
    setWeatherPlannerMessage(null);
    setWeatherProposal(null);
    try {
      const params = new URLSearchParams({
        latitude: anchor.latitude,
        longitude: anchor.longitude,
        startDate,
        endDate,
      });
      const response = await fetch(`/api/weather/forecast?${params}`);
      const body = await response.json() as {
        success: boolean;
        data: { available: boolean; availableFrom: string | null; days: WeatherForecastDay[] } | null;
        message: string | null;
      };
      if (!response.ok || !body.success || !body.data) throw new Error(body.message ?? "forecast failed");
      if (!body.data.available) {
        if (silent) {
          setWeatherPlannerState("idle");
        } else {
          setWeatherPlannerState("message");
          setWeatherPlannerMessage(body.data.availableFrom
            ? `${formatPlanDay(body.data.availableFrom)}부터 실제 예보로 변경안을 만들 수 있어요.`
            : "출발 16일 전부터 실제 예보로 변경안을 만들 수 있어요.");
        }
        return;
      }

      const rainyDay = body.data.days.find((day) =>
        planDays.includes(day.date) && (day.precipitationProbability >= 60 || isRainWeatherCode(day.weatherCode)),
      );
      if (!rainyDay) {
        if (silent) {
          setWeatherPlannerState("idle");
        } else {
          setWeatherPlannerState("message");
          setWeatherPlannerMessage("현재 예보에는 일정을 바꿀 만큼 큰 비 소식이 없어요.");
        }
        return;
      }

      const proposal = createWeatherReplanProposal(places, rainyDay, body.data.days);
      if (!proposal) {
        if (silent) {
          setWeatherPlannerState("idle");
        } else {
          setWeatherPlannerState("message");
          setWeatherPlannerMessage("비 예보 날짜가 이미 실내 일정 중심이에요. 현재 계획을 유지해도 좋아요.");
        }
        return;
      }
      setWeatherProposal(proposal);
      setWeatherPlannerState("idle");
      setActivePlanDate(rainyDay.date);
    } catch {
      if (silent) {
        setWeatherPlannerState("idle");
      } else {
        setWeatherPlannerState("message");
        setWeatherPlannerMessage("예보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.");
      }
    }
  }, [endDate, planDays, places, startDate]);

  useEffect(() => {
    if (!planningMode || !draftHydrated || planDays.length === 0) return;
    const anchor = places.find((place) => coordinate(place.latitude) !== null && coordinate(place.longitude) !== null);
    if (!anchor || !startDate || !endDate) return;
    const checkKey = `${startDate}:${endDate}:${anchor.latitude}:${anchor.longitude}`;
    if (weatherAutoCheckKey.current === checkKey) return;
    weatherAutoCheckKey.current = checkKey;
    const timer = window.setTimeout(() => {
      void buildWeatherReplanProposal({ silent: true });
    }, 600);
    return () => window.clearTimeout(timer);
  }, [buildWeatherReplanProposal, draftHydrated, endDate, planDays.length, places, planningMode, startDate]);

  useEffect(() => {
    if (weatherProposal && placeListSignature(places) !== weatherProposal.sourceSignature) {
      setWeatherProposal(null);
    }
  }, [places, weatherProposal]);

  function applyWeatherProposal() {
    if (!weatherProposal) return;
    if (placeListSignature(places) !== weatherProposal.sourceSignature) {
      setWeatherProposal(null);
      setWeatherPlannerState("message");
      setWeatherPlannerMessage("추천안을 만든 뒤 일정이 수정됐어요. 최신 일정으로 다시 만들어 주세요.");
      return;
    }
    setWeatherUndo({
      places: places.map((place) => ({ ...place })),
      appliedSignature: placeListSignature(weatherProposal.afterPlaces),
    });
    setPlaces(weatherProposal.afterPlaces.map((place) => ({ ...place })));
    setActivePlanDate(weatherProposal.rainyDate);
    setWeatherProposal(null);
    setWeatherPlannerState("message");
    setWeatherPlannerMessage("추천안을 적용했습니다. 계획을 저장하기 전까지 언제든 되돌릴 수 있어요.");
    setDirty(true);
  }

  function undoWeatherProposal() {
    if (!weatherUndo) return;
    if (placeListSignature(places) !== weatherUndo.appliedSignature) {
      setWeatherUndo(null);
      setWeatherPlannerState("message");
      setWeatherPlannerMessage("추천안 적용 후 직접 수정한 내용이 있어 자동으로 되돌리지 않았어요.");
      return;
    }
    setPlaces(weatherUndo.places.map((place) => ({ ...place })));
    setWeatherUndo(null);
    setWeatherProposal(null);
    setWeatherPlannerState("message");
    setWeatherPlannerMessage("날씨 변경 전 일정으로 되돌렸습니다.");
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

  async function addPhotoFiles(files: File[]) {
    if (!files.length) return;
    if (photoImporting) return;
    const configuration = uploadConfig;
    if (!configuration?.configured) {
      setStatus("사진 저장소가 아직 연결되지 않았습니다. 아래의 이미지 URL 방식은 계속 사용할 수 있어요.");
      return;
    }
    if (photos.length + files.length > configuration.maxPhotos) {
      setStatus(`사진은 여행 한 건에 최대 ${configuration.maxPhotos}장까지 올릴 수 있습니다.`);
      return;
    }
    const invalid = files.find((file) => !configuration.acceptedTypes.includes(file.type) || file.size > MAX_SOURCE_IMAGE_BYTES);
    if (invalid) {
      setStatus("JPG, PNG, WebP 형식의 30MB 이하 원본 사진만 올릴 수 있습니다.");
      return;
    }
    setStatus(null);
    setPhotoImporting(true);
    setPhotoImportNotice("사진의 촬영일과 위치를 확인하고 있어요.");
    try {
      const metadata = await Promise.all(files.map(readPhotoMetadata));
      const suggestions = metadata.map((item) => inferPhotoSchedule(item, places, startDate, endDate));
      const drafts = files.map((file, index) => {
        const previewUrl = URL.createObjectURL(file);
        return {
          ...emptyPhoto(),
          key: draftKey(),
          takenAt: suggestions[index].takenAt,
          placeIndex: suggestions[index].placeIndex,
          previewUrl,
          file,
          uploadState: "uploading" as const,
        };
      });
      const dateCount = suggestions.filter((suggestion) => suggestion.takenAt).length;
      const placeCount = suggestions.filter((suggestion) => suggestion.placeIndex).length;
      setPhotoImportNotice(
        dateCount || placeCount
          ? `촬영정보로 날짜 ${dateCount}장${placeCount ? ` · 장소 ${placeCount}장` : ""}을 자동 입력했어요. 저장 전에 확인해 주세요.`
          : "촬영정보가 없는 사진은 날짜와 장소를 직접 선택할 수 있어요.",
      );
      setPhotos((current) => [...current, ...drafts]);
      setDirty(true);
      drafts.forEach((draft) => void uploadDraft(draft.key, draft.file!, draft.previewUrl!));
    } finally {
      setPhotoImporting(false);
    }
  }

  function handlePhotoFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    void addPhotoFiles(files);
  }

  function handlePhotoDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    if (!uploadConfig?.configured || pending) return;
    void addPhotoFiles(Array.from(event.dataTransfer.files));
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

  async function handleSubmit() {
    if (!validateMobileEditorStep(0) || !validateMobileEditorStep(1)) return;
    setPending(true);
    setStatus(null);

    try {
      if (photos.some((photo) => photo.uploadState === "uploading")) {
        throw new ApiError(400, "사진 업로드가 끝난 뒤 저장해 주세요.");
      }
      if (photos.some((photo) => photo.uploadState === "error" || !photo.imageUrl.trim())) {
        throw new ApiError(400, "업로드하지 못한 사진을 다시 시도하거나 삭제해 주세요.");
      }
      if (planningMode && visibility === "PUBLIC" && places.some(isPlanningPlaceholder)) {
        throw new ApiError(400, "아직 장소를 고르지 않은 일정이 있어요. 모든 장소를 정한 뒤 기록으로 바꿔 주세요.");
      }
      if (planningMode && visibility === "PUBLIC" && !tripFinished) {
        throw new ApiError(400, "여행이 끝난 뒤 계획을 기록으로 전환할 수 있어요.");
      }
      const payload: TravelWriteInput = {
        title,
        description: nullable(description),
        startDate,
        endDate,
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

  function validateMobileEditorStep(step: number): boolean {
    if (step === 0) {
      if (!title.trim()) {
        setStatus("여행 제목을 입력해 주세요.");
        return false;
      }
      if (!startDate || !endDate) {
        setStatus("여행 시작일과 종료일을 선택해 주세요.");
        return false;
      }
      if (endDate < startDate) {
        setStatus("종료일은 시작일보다 빠를 수 없습니다.");
        return false;
      }
    }
    if (step === 1) {
      const incompletePlace = places.find((place) => !place.placeName.trim());
      if (incompletePlace) {
        setStatus(planningMode ? "아직 이름이 없는 일정을 확인해 주세요." : "방문한 장소의 이름을 입력해 주세요.");
        return false;
      }
      const unlocatedPlace = places.find((place) => coordinate(place.latitude) === null || coordinate(place.longitude) === null);
      if (unlocatedPlace) {
        setStatus("각 장소를 검색하거나 지도에서 위치를 선택해 주세요.");
        return false;
      }
    }
    return true;
  }

  function moveMobileEditorStep(direction: -1 | 1) {
    if (direction > 0 && !validateMobileEditorStep(mobileEditorStep)) return;
    const nextStep = Math.max(0, Math.min(MOBILE_EDITOR_STEPS.length - 1, mobileEditorStep + direction));
    setMobileEditorStep(nextStep);
    setActiveQuickAction(null);
    setStatus(null);
    window.requestAnimationFrame(() => {
      document.getElementById("mobile-travel-editor-progress")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function openQuickCapture(target: "place" | "photo" | "note") {
    setActiveQuickAction(target);
    setMobileEditorStep(target === "photo" ? 2 : 1);
    if (target === "photo") {
      window.setTimeout(() => {
        document.getElementById("travel-photo-editor")?.scrollIntoView({ behavior: "smooth", block: "start" });
        if (uploadConfig?.configured) photoInputRef.current?.click();
      }, 0);
      return;
    }

    const targetId = target === "note" ? "travel-note-editor" : "travel-place-editor";
    window.setTimeout(() => {
      document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
      if (target === "note") {
        document.getElementById("travel-note-editor")?.focus();
      } else {
        document.querySelector<HTMLInputElement>("#travel-place-editor input[aria-label='방문할 장소 검색']")?.focus();
      }
    }, 50);
  }

  return (
    <div className={`travel-editor${draftHydrated ? "" : " is-restoring"}`} onChange={() => setDirty(true)} aria-busy={!draftHydrated}>
      {planningMode ? (
        <section className={`travel-conversion${conversionReady ? " is-ready" : ""}`} data-mobile-active={mobileEditorStep === 2} aria-labelledby="travel-conversion-heading">
          <div>
            <h2 id="travel-conversion-heading">{tripFinished ? "이 계획을 여행 기록으로 완성하세요." : "다녀온 뒤, 같은 여행이 기록이 됩니다."}</h2>
            <p>{tripFinished ? "실제로 다녀온 장소와 사진을 확인한 뒤 한 번에 지구본에 남길 수 있습니다." : `${formatPlanDay(endDate)}까지는 나만 보는 계획으로 안전하게 보관됩니다.`}</p>
          </div>
          <ul aria-label="기록 전환 준비 상태">
            <li className={tripFinished ? "is-complete" : undefined}><span>{tripFinished ? "✓" : "1"}</span><div><strong>여행 완료</strong><small>{tripFinished ? "여행 기간이 지났습니다." : `${formatPlanDay(endDate)} 이후 열립니다.`}</small></div></li>
            <li className={placeholderCount === 0 ? "is-complete" : undefined}><span>{placeholderCount === 0 ? "✓" : "2"}</span><div><strong>실제 장소 확인</strong><small>{placeholderCount === 0 ? `${places.length}곳 확인 완료` : `${placeholderCount}개 일정의 장소가 미정입니다.`}</small></div></li>
            <li className={photos.length > 0 ? "is-complete" : undefined}><span>{photos.length > 0 ? "✓" : "3"}</span><div><strong>사진과 메모</strong><small>{photos.length > 0 ? `${photos.length}장의 장면을 담았습니다.` : "선택 사항 · 나중에 추가해도 됩니다."}</small></div></li>
          </ul>
          <button type="button" disabled={!conversionReady || pending} onClick={() => { setVisibility("PUBLIC"); setDirty(true); }}>
            {visibility === "PUBLIC" ? "기록 공개 선택됨 ✓" : conversionReady ? "기록으로 전환 준비" : tripFinished ? `미정 장소 ${placeholderCount}개 남음` : "여행 종료 후 전환 가능"}
          </button>
        </section>
      ) : null}
      <nav id="travel-quick-actions" className={`mobile-travel-quick-nav${travelActive ? " is-travel-mode" : ""}`} aria-label="여행 중 빠른 입력">
        <div>
          <small>빠른 기록</small>
          <strong>{planningMode && activePlanDate ? `${formatPlanDay(activePlanDate)} 일정` : "여행 기록"}</strong>
        </div>
        <div>
          <button type="button" aria-pressed={activeQuickAction === "place"} onClick={() => openQuickCapture("place")}><TravelActionIcon name="schedule" />일정</button>
          <button type="button" aria-pressed={activeQuickAction === "photo"} onClick={() => openQuickCapture("photo")}><TravelActionIcon name="photo" />사진</button>
          <button type="button" aria-pressed={activeQuickAction === "note"} onClick={() => openQuickCapture("note")}><TravelActionIcon name="note" />메모</button>
          <button type="button" onClick={() => void handleSubmit()} className="is-save" aria-label="여행 저장" disabled={pending}><TravelActionIcon name="save" />{pending ? "저장 중" : "저장"}</button>
        </div>
      </nav>
      <header id="mobile-travel-editor-progress" className="travel-editor__mobile-progress">
        <div><span>{mobileEditorStep + 1} / {MOBILE_EDITOR_STEPS.length}</span><strong>{MOBILE_EDITOR_STEPS[mobileEditorStep]}</strong></div>
        <span role="progressbar" aria-label="여행 편집 진행률" aria-valuemin={1} aria-valuemax={MOBILE_EDITOR_STEPS.length} aria-valuenow={mobileEditorStep + 1}>
          <i style={{ width: `${((mobileEditorStep + 1) / MOBILE_EDITOR_STEPS.length) * 100}%` }} />
        </span>
      </header>
      {status ? <p className="travel-editor__mobile-status" role="alert">{status}</p> : null}
      <section className="travel-editor__section" data-mobile-active={mobileEditorStep === 0}>
        <div className="travel-editor__section-heading"><span>01</span><div><h2>{planningMode ? "계획 기본 정보" : "여행 기본 정보"}</h2></div></div>
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
            <button type="button" className={visibility === "PUBLIC" ? "is-active" : ""} disabled={planningMode && !conversionReady} onClick={() => { setVisibility("PUBLIC"); setDirty(true); }}><strong>{planningMode ? "다녀왔어요 · 기록 공개" : "공개"}</strong><span>{planningMode ? (conversionReady ? "저장하면 내 지구본과 공개 프로필에 바로 반영됩니다." : "여행 완료와 실제 장소 확인 후 선택할 수 있어요.") : "내 지구본과 공개 프로필에 바로 반영됩니다."}</span></button>
          </fieldset>
        </div>
      </section>

      <section id="travel-place-editor" className="travel-editor__section" data-mobile-active={mobileEditorStep === 1}>
        <div className="travel-editor__section-heading"><span>02</span><div><h2>{planningMode ? "일차별 일정" : "방문 장소"}</h2><p>{planningMode ? "장소와 체류 시간을 확인하고 필요한 부분만 수정하세요." : "입력한 순서대로 지도에 경로가 표시됩니다."}</p></div></div>
        <div className="travel-editor__itinerary-content">
        {planningMode && planDays.length > 0 ? (
          <div className="plan-itinerary">
            <header className="plan-itinerary__progress">
              <div><strong>{completedPlanDays} / {planDays.length}일</strong><span>장소를 정한 날</span></div>
              <span aria-hidden="true"><i style={{ width: `${Math.round((completedPlanDays / planDays.length) * 100)}%` }} /></span>
            </header>
            <section className="weather-replan" aria-labelledby="weather-replan-heading">
              <div className="weather-replan__intro">
                <span className="weather-replan__icon" aria-hidden="true">☂</span>
                <div><small>날씨에 맞춘 일정</small><h3 id="weather-replan-heading">비 예보가 있는 날을 확인하세요</h3><p>실내 장소로 바꾼 일정을 비교한 뒤 직접 적용할 수 있습니다.</p></div>
                <button type="button" onClick={() => void buildWeatherReplanProposal()} disabled={weatherPlannerState === "loading" || pending}>{weatherPlannerState === "loading" ? "예보 확인 중…" : "예보 다시 확인"}</button>
              </div>
              {weatherPlannerMessage ? <div className="weather-replan__message" role="status"><span>{weatherPlannerMessage}</span>{weatherUndo ? <button type="button" onClick={undoWeatherProposal}>변경 전으로 되돌리기</button> : null}</div> : null}
              {weatherProposal ? <div className="weather-replan__proposal">
                <header><div><small>{formatPlanDay(weatherProposal.rainyDate)} 추천</small><strong>{weatherProposal.title}</strong><p>{weatherProposal.reason}</p></div><button type="button" onClick={() => setWeatherProposal(null)} aria-label="날씨 변경안 닫기">×</button></header>
                <div className="weather-replan__diff" aria-label="일정 변경 전후 비교">{weatherProposal.changes.map((change) => <div key={`${change.date}-${change.before}`}><time>{formatPlanDay(change.date)}</time><span><small>현재</small><b>{change.before}</b></span><i aria-hidden="true">→</i><span className="is-after"><small>변경 후</small><b>{change.after}</b></span></div>)}</div>
                <footer><p>자동 저장 전에 직접 확인할 수 있으며 예약 정보는 변경하지 않습니다.</p><button type="button" onClick={applyWeatherProposal}>이 변경안 적용</button></footer>
              </div> : null}
            </section>
            <div className="plan-itinerary__days" role="tablist" aria-label="여행 날짜 선택">
              {planDays.map((day, dayIndex) => {
                const dayPlaces = places.filter((place) => place.visitedAt === day);
                const ready = dayPlaces.some((place) => !isPlanningPlaceholder(place));
                return (
                  <button
                    key={day}
                    type="button"
                    role="tab"
                    aria-selected={activePlanDate === day}
                    tabIndex={activePlanDate === day ? 0 : -1}
                    className={`${activePlanDate === day ? "is-active" : ""}${ready ? " is-ready" : ""}`}
                    onClick={() => setActivePlanDate(day)}
                  >
                    <small>DAY {dayIndex + 1}</small><strong>{formatPlanDay(day)}</strong><span>{ready ? `${dayPlaces.length}곳` : "미정"}</span>
                  </button>
                );
              })}
            </div>
            <div className="plan-itinerary__view-switch" aria-label="일정 표시 방식">
              <div><strong>일정 보기</strong><span>필요한 만큼만 자세히 보세요.</span></div>
              <div>
                <button type="button" className={scheduleView === "simple" ? "is-active" : undefined} onClick={() => setScheduleView("simple")} aria-pressed={scheduleView === "simple"}>간단히</button>
                <button type="button" className={scheduleView === "timeline" ? "is-active" : undefined} onClick={() => setScheduleView("timeline")} aria-pressed={scheduleView === "timeline"}>시간표</button>
              </div>
            </div>
            <div className="plan-itinerary__toolbar">
              <div><strong>일정 빠르게 추가</strong><span>종류를 고른 뒤 장소만 검색하세요.</span></div>
              <div className="plan-itinerary__quick-actions">
                {PLAN_SLOT_PRESETS.map((slot) => <button key={slot} type="button" onClick={() => addPlanningPlace(slot)}>＋ {slot}</button>)}
                {planDays.indexOf(activePlanDate) > 0
                  && places.some((place) => place.visitedAt === planDays[planDays.indexOf(activePlanDate) - 1] && !isPlanningPlaceholder(place))
                  && !activeDayPlaces.some(({ place }) => !isPlanningPlaceholder(place)) ? (
                  <button type="button" className="is-copy" onClick={copyPreviousPlanDay}>전날 일정 복사</button>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
        <ol className={`travel-editor__places${planningMode && scheduleView === "timeline" ? " is-timeline" : ""}`}>
          {places.map((place, index) => planningMode && activePlanDate && place.visitedAt !== activePlanDate ? null : (
            <li key={place.key}>
              <div className="travel-editor__item-head">
                <strong>{planningMode ? `${String(activeDayPlaces.findIndex((item) => item.index === index) + 1).padStart(2, "0")}번째 일정` : `${String(index + 1).padStart(2, "0")}번째 장소`}{planningMode && place.startTime ? <time>{place.startTime}</time> : null}</strong>
                <div className="travel-editor__order-actions">
                  <button type="button" onClick={() => planningMode ? movePlanningPlace(index, -1) : movePlace(index, -1)} disabled={(planningMode ? activeDayPlaces[0]?.index === index : index === 0) || pending} aria-label="장소를 앞으로 이동">↑</button>
                  <button type="button" onClick={() => planningMode ? movePlanningPlace(index, 1) : movePlace(index, 1)} disabled={(planningMode ? activeDayPlaces.at(-1)?.index === index : index === places.length - 1) || pending} aria-label="장소를 뒤로 이동">↓</button>
                  {places.length > 1 ? <button type="button" className="is-danger" onClick={() => removePlace(index)}>삭제</button> : null}
                </div>
              </div>
              <div className="travel-editor__fields">
                <label><span>나라</span><select value={place.countryCode} onChange={(event) => updateCountry(index, event.target.value)} required>{countries.map((country) => <option key={country.iso2Code} value={country.iso2Code}>{country.label}</option>)}</select></label>
                <PlaceLocationPicker
                  key={place.countryCode}
                  countryCode={place.countryCode}
                  countryName={countryMap.get(place.countryCode)?.nameKo ?? "선택한 나라"}
                  placeName={place.placeName}
                  cityName={place.cityName}
                  fallbackLatitude={countryMap.get(place.countryCode)?.latitude ?? 36.5}
                  fallbackLongitude={countryMap.get(place.countryCode)?.longitude ?? 127.8}
                  latitude={coordinate(place.latitude)}
                  longitude={coordinate(place.longitude)}
                  routeAnchor={findRouteAnchor(places, index)}
                  travelPreferences={travelPreferences}
                  onSelect={(location) => updateLocation(index, location)}
                />
                <label><span>도시</span><input value={place.cityName} onChange={(event) => updateCityName(index, event.target.value)} maxLength={100} placeholder="예: 서울" /></label>
                <label className="is-wide"><span>장소 이름</span><input value={place.placeName} onChange={(event) => updatePlace(index, "placeName", event.target.value)} maxLength={150} placeholder="예: 서울숲" required /></label>
                <label><span>방문일</span><input value={place.visitedAt} onChange={(event) => updatePlace(index, "visitedAt", event.target.value)} type="date" /></label>
                {planningMode && scheduleView === "timeline" ? <div className="travel-editor__time-fields is-wide">
                  <label><span>시작 시간</span><input value={place.startTime} onChange={(event) => updatePlace(index, "startTime", event.target.value)} type="time" step="900" /></label>
                  <label><span>머무는 시간</span><select value={place.durationMinutes} onChange={(event) => updatePlace(index, "durationMinutes", event.target.value)}><option value="">미정</option><option value="30">30분</option><option value="45">45분</option><option value="60">1시간</option><option value="75">1시간 15분</option><option value="90">1시간 30분</option><option value="120">2시간</option><option value="180">3시간</option><option value="240">4시간</option></select></label>
                  <output><span>예상 종료</span><strong>{estimatedEndTime(place.startTime, place.durationMinutes) || "시간을 정하면 계산돼요"}</strong></output>
                </div> : null}
                <label className="is-wide"><span>메모</span><textarea id={index === quickNoteIndex ? "travel-note-editor" : undefined} value={place.memo} onChange={(event) => updatePlace(index, "memo", event.target.value)} maxLength={1000} rows={3} placeholder={planningMode ? "예약, 먹고 싶은 메뉴, 이동 팁" : "그 장소에서 기억하고 싶은 장면"} /></label>
              </div>
            </li>
          ))}
        </ol>
        {!planningMode ? <div className="travel-editor__add-row"><p>추가한 순서대로 상세 지도의 여행 경로가 이어집니다.</p><button type="button" onClick={() => { setPlaces((current) => [...current, emptyPlace(current.at(-1)?.countryCode ?? "KR")]); setDirty(true); }}>＋ 장소 추가</button></div> : null}
        </div>
      </section>

      <section id="travel-photo-editor" className="travel-editor__section" data-mobile-active={mobileEditorStep === 2}>
        <div className="travel-editor__section-heading"><span>03</span><div><h2>여행 사진</h2><p>사진을 추가하고 방문 장소와 연결할 수 있습니다.</p></div></div>
        <label
          className={`travel-editor__dropzone${uploadConfig?.configured ? " is-ready" : ""}`}
          onDragOver={(event) => event.preventDefault()}
          onDrop={handlePhotoDrop}
        >
          <input
            ref={photoInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={handlePhotoFiles}
            disabled={!uploadConfig?.configured || pending || photoImporting}
          />
          <span className="travel-editor__dropzone-icon" aria-hidden="true">＋</span>
          <strong>{photoImporting ? "촬영정보를 확인하고 있어요" : uploadConfig === null ? "사진 업로드 준비를 확인하고 있어요" : uploadConfig.configured ? "사진을 선택하거나 이곳에 놓아 주세요" : "사진 저장소 연결이 필요해요"}</strong>
          <small>{uploadConfig?.configured ? `JPG · PNG · WebP / 원본 30MB 이하 · 자동 최적화 / 최대 ${uploadConfig.maxPhotos}장` : "연결 전까지는 아래의 외부 이미지 주소 방식을 사용할 수 있어요."}</small>
        </label>
        {photoImportNotice ? <p className="travel-editor__photo-import-note" role="status">{photoImportNotice}</p> : null}
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
        <div><Link href={editing && initialTravel?.visibility === "PUBLIC" ? travelPath(username, initialTravel.id) : "/studio"}>취소</Link><button type="button" onClick={() => void handleSubmit()} disabled={pending}>{pending ? "저장 중…" : planningMode && visibility === "PUBLIC" ? "기록으로 전환하기" : planningMode ? "계획 저장" : editing ? "변경 내용 저장" : "여행 기록 저장"}</button></div>
      </footer>
      <nav className="travel-editor__mobile-nav" aria-label="여행 편집 단계 이동">
        <button type="button" className="is-previous" onClick={() => moveMobileEditorStep(-1)} disabled={mobileEditorStep === 0 || pending}>이전</button>
        <span><small>{mobileEditorStep + 1} / {MOBILE_EDITOR_STEPS.length}</small><strong>{MOBILE_EDITOR_STEPS[mobileEditorStep]}</strong></span>
        {mobileEditorStep < MOBILE_EDITOR_STEPS.length - 1 ? (
          <button key="next-editor-step" type="button" className="is-next" onClick={(event) => { event.preventDefault(); moveMobileEditorStep(1); }}>다음</button>
        ) : (
          <button key="submit-editor" type="button" onClick={() => void handleSubmit()} className="is-next" disabled={pending}>{pending ? "저장 중…" : planningMode && visibility === "PUBLIC" ? "기록으로 전환하기" : planningMode ? "계획 저장" : editing ? "변경 내용 저장" : "여행 기록 저장"}</button>
        )}
      </nav>
    </div>
  );
}

function emptyPlace(countryCode: string): PlaceDraft {
  return { key: draftKey(), countryCode, cityNameEn: "", cityName: "", placeName: "", latitude: "", longitude: "", visitedAt: "", startTime: "", durationMinutes: "", memo: "", completed: false };
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

function datesBetween(startDate: string, endDate: string): string[] {
  if (!startDate || !endDate || endDate < startDate) return [];
  const start = Date.parse(`${startDate}T00:00:00Z`);
  const end = Date.parse(`${endDate}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return [];
  const days = Math.min(Math.floor((end - start) / 86_400_000) + 1, 31);
  return Array.from({ length: days }, (_, index) => new Date(start + index * 86_400_000).toISOString().slice(0, 10));
}

function formatPlanDay(value: string): string {
  const [, month, day] = value.split("-");
  return `${Number(month)}.${String(day).padStart(2, "0")}`;
}

function nextPlanningTime(existingTimes: string[], slot: (typeof PLAN_SLOT_PRESETS)[number]): string {
  const fallback: Record<(typeof PLAN_SLOT_PRESETS)[number], string> = {
    관광: "10:00", 식사: "12:30", 카페: "15:00", 숙소: "20:00",
  };
  const latest = existingTimes.filter(Boolean).sort().at(-1);
  if (!latest) return fallback[slot];
  const [hour, minute] = latest.split(":").map(Number);
  const nextMinutes = Math.min(23 * 60 + 45, hour * 60 + minute + 120);
  return `${String(Math.floor(nextMinutes / 60)).padStart(2, "0")}:${String(nextMinutes % 60).padStart(2, "0")}`;
}

function estimatedEndTime(startTime: string, duration: string): string {
  if (!startTime || !duration) return "";
  const [hour, minute] = startTime.split(":").map(Number);
  const total = hour * 60 + minute + Number(duration);
  if (!Number.isFinite(total)) return "";
  const dayOffset = Math.floor(total / 1440);
  const withinDay = total % 1440;
  const formatted = `${String(Math.floor(withinDay / 60)).padStart(2, "0")}:${String(withinDay % 60).padStart(2, "0")}`;
  return dayOffset ? `${formatted} · 다음 날` : formatted;
}

function isPlanningPlaceholder(place: PlaceDraft): boolean {
  return isPlaceholderPlaceName(place.placeName);
}

function planDayInsertionIndex(places: PlaceDraft[], day: string): number {
  const lastSameDay = places.reduce(
    (lastIndex, place, index) => place.visitedAt === day ? index : lastIndex,
    -1,
  );
  if (lastSameDay >= 0) return lastSameDay + 1;
  const firstLaterDay = places.findIndex((place) => Boolean(place.visitedAt) && place.visitedAt > day);
  return firstLaterDay >= 0 ? firstLaterDay : places.length;
}

function createWeatherReplanProposal(
  places: PlaceDraft[],
  rainyDay: WeatherForecastDay,
  forecastDays: WeatherForecastDay[],
): WeatherReplanProposal | null {
  const sourceSignature = placeListSignature(places);
  const rainyPlaces = places.filter((place) => place.visitedAt === rainyDay.date);
  const filledRainyPlaces = rainyPlaces.filter((place) => !isPlanningPlaceholder(place));
  const outdoorCandidate = filledRainyPlaces.find((place) => !isIndoorPlace(place));

  if (filledRainyPlaces.length > 0 && !outdoorCandidate) return null;

  const dryDates = new Set(forecastDays
    .filter((day) => day.date !== rainyDay.date
      && day.precipitationProbability < 40
      && !isRainWeatherCode(day.weatherCode))
    .map((day) => day.date));
  const indoorCandidate = places.find((place) =>
    dryDates.has(place.visitedAt) && !isPlanningPlaceholder(place) && isIndoorPlace(place),
  );

  if (outdoorCandidate && indoorCandidate) {
    const alternativeDate = indoorCandidate.visitedAt;
    const afterPlaces = places.map((place) => {
      if (place.key === outdoorCandidate.key) return { ...place, visitedAt: alternativeDate };
      if (place.key === indoorCandidate.key) return { ...place, visitedAt: rainyDay.date };
      return { ...place };
    });
    return {
      rainyDate: rainyDay.date,
      sourceSignature,
      afterPlaces,
      title: "실내 일정과 야외 일정을 맞바꿨어요",
      reason: `${rainyDay.precipitationProbability}% 비 예보를 기준으로 실내 후보를 비 오는 날로 옮겼습니다. 이동시간과 예약 여부를 확인한 뒤 적용해 주세요.`,
      changes: [
        {
          date: rainyDay.date,
          before: summarizeDay(places, rainyDay.date),
          after: summarizeDay(afterPlaces, rainyDay.date),
        },
        {
          date: alternativeDate,
          before: summarizeDay(places, alternativeDate),
          after: summarizeDay(afterPlaces, alternativeDate),
        },
      ],
    };
  }

  const placeholder = rainyPlaces.find(isPlanningPlaceholder);
  let afterPlaces: PlaceDraft[];
  if (placeholder) {
    afterPlaces = places.map((place) => place.key === placeholder.key
      ? { ...place, placeName: "실내 대안 · 장소를 골라주세요", memo: "비 예보에 대비할 실내 장소를 하나 정해두세요." }
      : { ...place });
  } else {
    const anchor = rainyPlaces[0] ?? places[0];
    afterPlaces = [...places.map((place) => ({ ...place })), {
      ...emptyPlace(anchor?.countryCode ?? "KR"),
      countryCode: anchor?.countryCode ?? "KR",
      cityName: anchor?.cityName ?? "",
      cityNameEn: anchor?.cityNameEn ?? "",
      latitude: anchor?.latitude ?? "",
      longitude: anchor?.longitude ?? "",
      visitedAt: rainyDay.date,
      placeName: "실내 대안 · 장소를 골라주세요",
      memo: "비 예보에 대비할 실내 장소를 하나 정해두세요.",
    }];
  }

  return {
    rainyDate: rainyDay.date,
    sourceSignature,
    afterPlaces,
    title: "비 오는 날에 실내 대안 자리를 만들었어요",
    reason: `${rainyDay.precipitationProbability}% 비 예보가 있지만 교환할 실내 일정이 없어, 기존 일정을 지우지 않고 대체 장소 슬롯만 추가합니다.`,
    changes: [{
      date: rainyDay.date,
      before: summarizeDay(places, rainyDay.date),
      after: summarizeDay(afterPlaces, rainyDay.date),
    }],
  };
}

function placeListSignature(places: PlaceDraft[]): string {
  return JSON.stringify(places.map((place) => [
    place.key,
    place.countryCode,
    place.cityName,
    place.placeName,
    place.visitedAt,
    place.latitude,
    place.longitude,
    place.memo,
  ]));
}

function summarizeDay(places: PlaceDraft[], date: string): string {
  const names = places
    .filter((place) => place.visitedAt === date)
    .map((place) => place.placeName.trim())
    .filter(Boolean);
  if (names.length === 0) return "일정 없음";
  return names.length <= 2 ? names.join(" · ") : `${names.slice(0, 2).join(" · ")} 외 ${names.length - 2}곳`;
}

function isIndoorPlace(place: PlaceDraft): boolean {
  const text = `${place.placeName} ${place.memo}`.toLowerCase();
  return [
    "박물관", "미술관", "전시", "갤러리", "카페", "커피", "식당", "레스토랑", "백화점",
    "쇼핑몰", "아쿠아리움", "수족관", "실내", "공연", "극장", "스파", "museum", "gallery",
    "cafe", "coffee", "restaurant", "mall", "aquarium", "indoor", "theater", "theatre",
  ].some((keyword) => text.includes(keyword));
}

function isRainWeatherCode(code: number): boolean {
  return (code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95;
}

function inferPhotoSchedule(
  metadata: PhotoMetadata,
  places: PlaceDraft[],
  startDate: string,
  endDate: string,
): { takenAt: string; placeIndex: string } {
  const metadataDateFits = Boolean(metadata.takenAt)
    && (!startDate || metadata.takenAt! >= startDate)
    && (!endDate || metadata.takenAt! <= endDate);
  let takenAt = metadataDateFits ? metadata.takenAt! : "";
  let placeIndex = "";

  if (metadata.latitude !== null && metadata.longitude !== null) {
    const candidates = places
      .map((place, index) => ({
        index,
        place,
        latitude: coordinate(place.latitude),
        longitude: coordinate(place.longitude),
      }))
      .filter((candidate) => candidate.latitude !== null && candidate.longitude !== null);
    const sameDayCandidates = takenAt
      ? candidates.filter((candidate) => candidate.place.visitedAt === takenAt)
      : [];
    const ranked = (sameDayCandidates.length ? sameDayCandidates : candidates)
      .map((candidate) => ({
        ...candidate,
        distance: distanceInKilometers(
          metadata.latitude!,
          metadata.longitude!,
          candidate.latitude!,
          candidate.longitude!,
        ),
      }))
      .sort((left, right) => left.distance - right.distance);
    if (ranked[0] && ranked[0].distance <= 100) {
      placeIndex = String(ranked[0].index);
      if (!takenAt && ranked[0].place.visitedAt) takenAt = ranked[0].place.visitedAt;
    }
  }

  if (!placeIndex && takenAt) {
    const sameDayIndex = places.findIndex((place) => place.visitedAt === takenAt);
    if (sameDayIndex >= 0) placeIndex = String(sameDayIndex);
  }
  return { takenAt, placeIndex };
}

function distanceInKilometers(
  firstLatitude: number,
  firstLongitude: number,
  secondLatitude: number,
  secondLongitude: number,
): number {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const latitudeDistance = radians(secondLatitude - firstLatitude);
  const longitudeDistance = radians(secondLongitude - firstLongitude);
  const firstRadians = radians(firstLatitude);
  const secondRadians = radians(secondLatitude);
  const haversine = Math.sin(latitudeDistance / 2) ** 2
    + Math.cos(firstRadians) * Math.cos(secondRadians) * Math.sin(longitudeDistance / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function nullable(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function coordinate(value: string): number | null {
  const parsed = Number(value);
  return value.trim() && Number.isFinite(parsed) ? parsed : null;
}

function findRouteAnchor(places: PlaceDraft[], currentIndex: number): { latitude: number; longitude: number } | null {
  const currentDate = places[currentIndex]?.visitedAt;
  const earlierPlaces = places.slice(0, currentIndex).reverse();
  const candidates = [
    ...earlierPlaces.filter((place) => place.visitedAt === currentDate),
    ...earlierPlaces.filter((place) => place.visitedAt !== currentDate),
  ];
  for (const place of candidates) {
    if (isPlanningPlaceholder(place)) continue;
    const latitude = coordinate(place.latitude);
    const longitude = coordinate(place.longitude);
    if (latitude !== null && longitude !== null) return { latitude, longitude };
  }
  return null;
}

function recommendationPreferences(source: string): string[] {
  const text = source.toLowerCase();
  const keywords: Array<[string, string[]]> = [
    ["food", ["맛집", "미식", "음식", "먹방", "카페", "food", "gourmet"]],
    ["culture", ["문화", "박물관", "미술관", "전시", "역사", "공연", "culture", "museum"]],
    ["nature", ["자연", "공원", "산", "바다", "정원", "풍경", "nature", "hiking"]],
    ["shopping", ["쇼핑", "시장", "백화점", "기념품", "shopping", "market"]],
    ["relax", ["여유", "휴식", "힐링", "느긋", "relax", "slow"]],
    ["family", ["가족", "아이", "부모님", "family", "kids"]],
  ];
  return keywords.filter(([, values]) => values.some((keyword) => text.includes(keyword))).map(([key]) => key);
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
    startTime: nullable(place.startTime),
    durationMinutes: place.durationMinutes ? Number(place.durationMinutes) : null,
    completed: place.completed,
  };
}

function toPhotoInput(photo: PhotoDraft): TravelPhotoWriteInput {
  return {
    imageUrl: photo.imageUrl.trim(), caption: nullable(photo.caption), takenAt: nullable(photo.takenAt),
    placeIndex: photo.placeIndex === "" ? null : Number(photo.placeIndex),
  };
}
