"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { ChangeEvent, DragEvent, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import { WorkspaceTabs } from "@/components/common/WorkspaceTabs";
import { TravelWorkspaceContext } from "@/components/planner/MobilePlanningWorkspace";
import { TravelActionIcon } from "@/components/common/TravelActionIcon";
import { WeatherIcon } from "@/components/common/WeatherIcon";
import { GoogleDirectionsPanel } from "@/components/travel/GoogleDirectionsPanel";
import { VisitOrderSuggestion } from "@/components/studio/VisitOrderSuggestion";
import { ApiError, apiMutation } from "@/lib/api/client";
import type { CountryOption } from "@/lib/countries";
import {
  deleteUploadedPhoto,
  getUploadConfiguration,
  MAX_SOURCE_IMAGE_BYTES,
  type UploadConfiguration,
  uploadPhoto,
} from "@/lib/uploads/client";
import { readPhotoMetadata } from "@/lib/uploads/photo-metadata";
import { useUnsavedChangesGuard } from "@/lib/useUnsavedChangesGuard";
import { fetchTripWeather, isRainyDay, useTripWeather, WEATHER_SOURCE_LABEL, weatherLabel, type WeatherDay } from "@/lib/weather";
import type { TravelDetail, TravelWriteInput, Visibility } from "@/types";
const PlaceLocationPicker = dynamic(() => import("@/components/studio/PlaceLocationPicker").then((module) => module.PlaceLocationPicker), { loading: () => <p role="status">장소 검색을 준비하고 있어요…</p> });
import { PlanSharePanel } from "@/components/studio/PlanSharePanel";
import { useStopDrag } from "@/components/studio/useStopDrag";
import {
  coordinate,
  createWeatherReplanProposal,
  datesBetween,
  draftKey,
  emptyPhoto,
  emptyPlace,
  estimatedEndTime,
  findRouteAnchor,
  formatDraftTime,
  formatPlanDay,
  inferPhotoSchedule,
  isPlanningPlaceholder,
  nextPlanningTime,
  nullable,
  placeListSignature,
  PLAN_SLOT_PRESETS,
  planDayInsertionIndex,
  recommendationPreferences,
  toPhotoInput,
  toPlaceInput,
  toStoredPhoto,
  type PhotoDraft,
  type PlaceDraft,
  type StoredTravelDraft,
  type WeatherReplanProposal,
  type WeatherUndoSnapshot,
} from "@/components/studio/travel-editor-model";
import { Icon } from "@/components/common/Icon";

interface TravelEditorProps {
  username: string;
  countries: CountryOption[];
  initialTravel?: TravelDetail;
  initialCountryCode?: string;
  planningMode?: boolean;
  today?: string;
}

const EDITOR_TABS = ["일정", "사진·메모", "여행 정보"] as const;
const EDITOR_SECTIONS = [1, 2, 0];

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
          key: `saved-place-${place.id}`,
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
      : [{ ...emptyPlace(initialCountryCode), key: "initial-place" }],
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
  const workspace = useContext(TravelWorkspaceContext);
  const [editorSection, setEditorSection] = useState(initialTravel ? 1 : 0);
  const mobileEditorStep = workspace?.section ?? editorSection;
  const setMobileEditorStep = workspace?.selectSection ?? setEditorSection;
  const editorTabsId = workspace?.tabsId ?? "travel-edit";
  const sectionTab = (section: number) => workspace ? workspace.tabIndexForSection(section) : EDITOR_SECTIONS.indexOf(section);
  const [expandedPlace, setExpandedPlace] = useState<string | null>(null);
  const [newPlaceKey, setNewPlaceKey] = useState<string | null>(null);
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
  const weatherAnchor = places.find((place) => coordinate(place.latitude) !== null && coordinate(place.longitude) !== null);
  const dayWeather = useTripWeather(planningMode && weatherAnchor ? {
    latitude: Number(weatherAnchor.latitude), longitude: Number(weatherAnchor.longitude), startDate, endDate,
  } : null);
  const weatherByDate = useMemo(() => new Map((dayWeather.weather?.days ?? []).map((day) => [day.date, day])), [dayWeather.weather]);

  useEffect(() => {
    if (!planningMode || planDays.length === 0) return;
    if (!activePlanDate || !planDays.includes(activePlanDate)) setActivePlanDate(planDays[0]);
  }, [activePlanDate, planDays, planningMode]);

  useEffect(() => {
    const syncStepWithHash = () => {
      if (window.location.hash.startsWith("#travel-photo-editor")) setEditorSection(2);
      else if (window.location.hash === "#travel-info-editor") setEditorSection(0);
      else if (["#travel-place-editor", "#travel-note-editor", "#itinerary-editor"].some((hash) => window.location.hash.startsWith(hash))) setEditorSection(1);
    };
    syncStepWithHash();
    window.addEventListener("hashchange", syncStepWithHash);
    return () => window.removeEventListener("hashchange", syncStepWithHash);
  }, []);

  useEffect(() => {
    if (mobileEditorStep !== 2 || uploadConfig !== null) return;
    let active = true;
    getUploadConfiguration()
      .then((configuration) => {
        if (active) setUploadConfig(configuration);
      })
      .catch(() => {
        if (active) setUploadConfig({ configured: false, maxBytes: 10 * 1024 * 1024, maxPhotos: 30, acceptedTypes: ["image/jpeg", "image/png", "image/webp"] });
      });
    return () => { active = false; };
  }, [mobileEditorStep, uploadConfig]);

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

  const stopDrag = useStopDrag(reorderPlace);
  const [orderNotice, setOrderNotice] = useState("");

  function reorderPlace(fromKey: string, toKey: string) {
    const indexes = places.map((place, index) => ({ place, index }))
      .filter(({ place }) => !planningMode || place.visitedAt === activePlanDate).map(({ index }) => index);
    const ordered = indexes.map((index) => places[index]);
    const from = ordered.findIndex((place) => place.key === fromKey);
    const to = ordered.findIndex((place) => place.key === toKey);
    if (pending || from < 0 || to < 0 || from === to) return;
    const [moved] = ordered.splice(from, 1);
    ordered.splice(to, 0, moved);
    const next = [...places];
    indexes.forEach((index, position) => { next[index] = ordered[position]; });
    setPlaces(next);
    setPhotos((current) => current.map((photo) => {
      if (photo.placeIndex === "") return photo;
      const key = places[Number(photo.placeIndex)]?.key;
      const position = next.findIndex((place) => place.key === key);
      return { ...photo, placeIndex: position < 0 ? "" : String(position) };
    }));
    setDirty(true);
    setOrderNotice(`${moved.placeName || "장소"}을 ${to + 1}번째로 옮겼습니다. 시간은 그대로 유지됩니다.`);
  }

  function applyVisitOrder(keys: string[]) {
    const indexes = places.map((place, index) => ({ place, index })).filter(({ place }) => place.visitedAt === activePlanDate).map(({ index }) => index);
    const byKey = new Map(indexes.map((index) => [places[index].key, places[index]]));
    if (pending || keys.length !== indexes.length || new Set(keys).size !== indexes.length || keys.some((key) => !byKey.has(key))) return;
    const next = [...places];
    indexes.forEach((index, position) => { next[index] = byKey.get(keys[position])!; });
    setPlaces(next);
    setPhotos((current) => current.map((photo) => {
      if (photo.placeIndex === "") return photo;
      const key = places[Number(photo.placeIndex)]?.key;
      const index = next.findIndex((place) => place.key === key);
      return { ...photo, placeIndex: index < 0 ? "" : String(index) };
    }));
    setExpandedPlace(null);
    setDirty(true);
  }

  function movePlace(index: number, direction: -1 | 1) {
    const target = places[index + direction];
    if (target) reorderPlace(places[index].key, target.key);
  }

  function movePlanningPlace(index: number, direction: -1 | 1) {
    const siblingIndexes = places
      .map((place, placeIndex) => ({ place, placeIndex }))
      .filter(({ place }) => place.visitedAt === activePlanDate)
      .map(({ placeIndex }) => placeIndex);
    const siblingIndex = siblingIndexes.indexOf(index);
    const targetIndex = siblingIndexes[siblingIndex + direction];
    if (targetIndex === undefined) return;
    reorderPlace(places[index].key, places[targetIndex].key);
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
    setExpandedPlace(nextPlace.key);
    setNewPlaceKey(nextPlace.key);
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
      const weather = await fetchTripWeather({ latitude: Number(anchor.latitude), longitude: Number(anchor.longitude), startDate, endDate }, { force: !silent });
      // Only a real forecast is strong enough to move plans; climate averages are shown, not acted on.
      const forecastDays = weather.days.filter((day) => day.source === "forecast");
      if (!forecastDays.length) {
        if (silent) {
          setWeatherPlannerState("idle");
        } else {
          setWeatherPlannerState("message");
          setWeatherPlannerMessage(weather.availableFrom
            ? `${formatPlanDay(weather.availableFrom)}부터 실제 예보로 변경안을 만들 수 있어요.`
            : "출발 약 2주 전부터 실제 예보로 변경안을 만들 수 있어요.");
        }
        return;
      }

      const rainyDay = forecastDays.find((day) => planDays.includes(day.date) && isRainyDay(day));
      if (!rainyDay) {
        if (silent) {
          setWeatherPlannerState("idle");
        } else {
          setWeatherPlannerState("message");
          setWeatherPlannerMessage("현재 예보에는 일정을 바꿀 만큼 큰 비 소식이 없어요.");
        }
        return;
      }

      const proposal = createWeatherReplanProposal(places, rainyDay, forecastDays);
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
    if (pending || !window.confirm(`“${places[index].placeName || "이 장소"}”을 일정에서 삭제할까요? 연결된 사진은 여행에 남습니다.`)) return;
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
    for (const section of [0, 1]) {
      if (!validateMobileEditorStep(section)) {
        setMobileEditorStep(section);
        const invalid = places.find((place) => !place.placeName.trim() || coordinate(place.latitude) === null || coordinate(place.longitude) === null);
        if (section === 1 && invalid) { setExpandedPlace(invalid.key); if (planningMode) setActivePlanDate(invalid.visitedAt); }
        return;
      }
    }
    setPending(true);
    setStatus(null);

    try {
      if (photos.some((photo) => photo.uploadState === "uploading")) {
        throw new ApiError(400, "사진 업로드가 끝난 뒤 저장해 주세요.");
      }
      if (photos.some((photo) => photo.uploadState === "error" || !photo.imageUrl.trim())) {
        setMobileEditorStep(2);
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
      // The trip no longer references these files; cleaning them up must not hold the save.
      void Promise.allSettled(removedPhotoUrls.map((publicUrl) => deleteUploadedPhoto({ publicUrl })));
      const savedPhotoKeys = new Set(photos.map((photo) => photo.key));
      // Saved uploads now belong to the travel. Remove them only after a later save.
      setPhotos((current) => current.map((photo) => savedPhotoKeys.has(photo.key) ? { ...photo, objectKey: null } : photo));
      setRemovedPhotoUrls((current) => current.filter((url) => !removedPhotoUrls.includes(url)));
      window.localStorage.removeItem(draftStorageKey);
      setDirty(false);
      setDraftRestored(false);
      setDraftStatus("서버에 저장됨");
      if (editing) {
        setPending(false);
      } else {
        router.replace(`/studio/travels/${result.id}/edit#travel-place-editor`);
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
      void Promise.allSettled([...new Set(storedUrls)].map((publicUrl) => deleteUploadedPhoto({ publicUrl })));
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

  function openQuickCapture(target: "place" | "photo" | "note") {
    setActiveQuickAction(target);
    if (target !== "photo") setExpandedPlace(places[quickNoteIndex]?.key ?? null);
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
      {!workspace ? <WorkspaceTabs id={editorTabsId} label="여행 편집" items={EDITOR_TABS} active={EDITOR_SECTIONS.indexOf(mobileEditorStep)} onChange={(index) => setMobileEditorStep(EDITOR_SECTIONS[index])} /> : null}
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
      {status ? <p className="editor-notice" role="alert">{status}</p> : null}
      <section id={`${editorTabsId}-panel-${sectionTab(0)}`} role="tabpanel" aria-labelledby={`${editorTabsId}-tab-${sectionTab(0)}`} className="travel-editor__section" hidden={mobileEditorStep !== 0} data-mobile-active={mobileEditorStep === 0}>
        <div className="travel-editor__section-heading"><span>01</span><div><h2>{planningMode ? "계획 기본 정보" : "여행 기본 정보"}</h2></div></div>
        <div className="travel-editor__fields">
          <label className="is-wide"><span>여행 제목</span><input name="title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} placeholder={planningMode ? "다음 여행의 이름" : "예: 교토의 가을"} required /></label>
          <label><span>시작일</span><input name="startDate" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} required /></label>
          <label><span>종료일</span><input name="endDate" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} required /></label>
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
            <legend>공개 범위</legend>
            <button type="button" className={visibility === "PRIVATE" ? "is-active" : ""} onClick={() => { setVisibility("PRIVATE"); setDirty(true); }}><strong>비공개</strong><span>나만 볼 수 있어요.</span></button>
            <button type="button" className={visibility === "PUBLIC" ? "is-active" : ""} disabled={planningMode && !conversionReady} onClick={() => { setVisibility("PUBLIC"); setDirty(true); }}><strong>공개</strong><span>{planningMode ? (conversionReady ? "저장하면 내 지구본과 공개 프로필에 바로 반영됩니다." : "여행 완료와 실제 장소 확인 후 선택할 수 있어요.") : "내 지구본과 공개 프로필에 바로 반영됩니다."}</span></button>
          </fieldset>
        </div>
      </section>

      <section id={`${editorTabsId}-panel-${sectionTab(1)}`} role="tabpanel" aria-labelledby={`${editorTabsId}-tab-${sectionTab(1)}`} className="travel-editor__section travel-editor__section--itinerary" hidden={mobileEditorStep !== 1} data-mobile-active={mobileEditorStep === 1}><div id="travel-place-editor">
        <div className="travel-editor__section-heading"><span>02</span><div><h2>{planningMode ? "일차별 일정" : "방문 장소"}</h2><p>{planningMode ? "장소와 체류 시간을 확인하고 필요한 부분만 수정하세요." : "장소를 순서대로 정하고 실제 이동 경로를 확인하세요."}</p></div></div>
        <div className="travel-editor__itinerary-content">
        {planningMode && planDays.length > 0 ? (
          <div className="plan-itinerary">
            <header className="plan-itinerary__progress">
              <div><strong>{completedPlanDays} / {planDays.length}일</strong><span>장소를 정한 날</span></div>
              <span aria-hidden="true"><i style={{ width: `${Math.round((completedPlanDays / planDays.length) * 100)}%` }} /></span>
            </header>
            {weatherProposal || weatherUndo || weatherPlannerMessage ? <section className="weather-replan" aria-labelledby="weather-replan-heading">
              <div className="weather-replan__intro">
                <span className="weather-replan__icon" aria-hidden="true"><Icon name="umbrella" /></span>
                <div><small>날씨에 맞춘 일정</small><h3 id="weather-replan-heading">비 예보가 있는 날을 확인하세요</h3><p>실내 장소로 바꾼 일정을 비교한 뒤 직접 적용할 수 있습니다.</p></div>
                <button type="button" onClick={() => void buildWeatherReplanProposal()} disabled={weatherPlannerState === "loading" || pending}>{weatherPlannerState === "loading" ? "예보 확인 중…" : "예보 다시 확인"}</button>
              </div>
              {weatherPlannerMessage ? <div className="weather-replan__message" role="status"><span>{weatherPlannerMessage}</span>{weatherUndo ? <button type="button" onClick={undoWeatherProposal}>변경 전으로 되돌리기</button> : null}</div> : null}
              {weatherProposal ? <div className="weather-replan__proposal">
                <header><div><small>{formatPlanDay(weatherProposal.rainyDate)} 추천</small><strong>{weatherProposal.title}</strong><p>{weatherProposal.reason}</p></div><button type="button" onClick={() => setWeatherProposal(null)} aria-label="날씨 변경안 닫기"><Icon name="close" /></button></header>
                <div className="weather-replan__diff" aria-label="일정 변경 전후 비교">{weatherProposal.changes.map((change) => <div key={`${change.date}-${change.before}`}><time>{formatPlanDay(change.date)}</time><span><small>현재</small><b>{change.before}</b></span><i aria-hidden="true"><Icon name="arrow-right" /></i><span className="is-after"><small>변경 후</small><b>{change.after}</b></span></div>)}</div>
                <footer><p>자동 저장 전에 직접 확인할 수 있으며 예약 정보는 변경하지 않습니다.</p><button type="button" onClick={applyWeatherProposal}>이 변경안 적용</button></footer>
              </div> : null}
            </section> : null}
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
                    {weatherByDate.get(day) ? <DayWeather day={weatherByDate.get(day)!} /> : null}
                  </button>
                );
              })}
            </div>
            <div className="plan-itinerary__toolbar">
              <div><strong>일정 빠르게 추가</strong><span>종류를 고른 뒤 장소만 검색하세요.</span></div>
              <div className="plan-itinerary__quick-actions">
                {PLAN_SLOT_PRESETS.map((slot) => <button key={slot} type="button" aria-label={`${slot} 일정 추가`} onClick={() => addPlanningPlace(slot)}><Icon name="plus" /> {slot}</button>)}
                {planDays.indexOf(activePlanDate) > 0
                  && places.some((place) => place.visitedAt === planDays[planDays.indexOf(activePlanDate) - 1] && !isPlanningPlaceholder(place))
                  && !activeDayPlaces.some(({ place }) => !isPlanningPlaceholder(place)) ? (
                  <button type="button" className="is-copy" onClick={copyPreviousPlanDay}>전날 일정 복사</button>
                ) : null}
              </div>
              {!weatherProposal && !weatherUndo && !weatherPlannerMessage ? <button type="button" className="plan-itinerary__weather-check" aria-label="예보 다시 확인" onClick={() => void buildWeatherReplanProposal()} disabled={weatherPlannerState === "loading" || pending}>{weatherPlannerState === "loading" ? "날씨 확인 중…" : "날씨에 맞춰 조정"}</button> : null}
            </div>
          </div>
        ) : null}
        <p className="editor-order-hint" id="stop-drag-help">방문 순서대로 놓아주세요. ⋮⋮ 손잡이를 끌거나, 손잡이에 초점을 두고 ↑ ↓ 키로 옮길 수 있어요.</p>
        <p className="editor-order-notice" role="status">{orderNotice}</p>
        <ol className="travel-editor__places">
          {places.map((place, index) => planningMode && activePlanDate && place.visitedAt !== activePlanDate ? null : (
            <li key={place.key} data-stop-key={place.key} className={`editor-stop${stopDrag.drag?.from === place.key ? " is-dragging" : ""}${stopDrag.drag?.to === place.key && stopDrag.drag.from !== place.key ? " is-drop-target" : ""}`}>
              <div className="editor-stop__row">
              <button type="button" className="editor-stop__drag" aria-label={`${place.placeName || "장소"} 순서 이동`} aria-describedby="stop-drag-help" disabled={pending}
                onPointerDown={(event) => { setExpandedPlace(null); stopDrag.start(event, place.key); }} onPointerMove={stopDrag.move} onPointerUp={stopDrag.finish} onPointerCancel={stopDrag.cancel} onLostPointerCapture={stopDrag.cancel}
                onKeyDown={(event) => {
                  if (event.key === "Escape") stopDrag.cancel();
                  if (event.key === "ArrowUp" || event.key === "ArrowDown") {
                    event.preventDefault();
                    const direction = event.key === "ArrowUp" ? -1 : 1;
                    if (planningMode) movePlanningPlace(index, direction); else movePlace(index, direction);
                  }
                }}><span aria-hidden="true"><Icon name="grip" /></span></button>
              <button className="editor-stop__summary" type="button" aria-expanded={expandedPlace === place.key} aria-controls={`stop-${index}`} onClick={() => setExpandedPlace(expandedPlace === place.key ? null : place.key)}>
                <span className="editor-stop__sequence" aria-label="방문 순번">{String((planningMode ? activeDayPlaces.findIndex((item) => item.index === index) : index) + 1).padStart(2, "0")}</span>
                <span><strong>{place.placeName || "장소를 추가하세요"}</strong><small>{[place.cityName || countryMap.get(place.countryCode)?.nameKo, place.startTime || null, place.durationMinutes ? `${place.durationMinutes}분` : null].filter(Boolean).join(" · ")}</small></span>
                <span className="editor-stop__edit">{expandedPlace === place.key ? <>편집 닫기 <Icon name="chevron-up" /></> : <>편집 <Icon name="edit" /></>}</span>
              </button>
              </div>
              <div id={`stop-${index}`} className="editor-stop__body" hidden={expandedPlace !== place.key}>
              <div className="travel-editor__item-head">
                <strong>{planningMode ? `${String(activeDayPlaces.findIndex((item) => item.index === index) + 1).padStart(2, "0")}번째 일정` : `${String(index + 1).padStart(2, "0")}번째 장소`}{planningMode && place.startTime ? <time>{place.startTime}</time> : null}</strong>
                <div className="travel-editor__order-actions">
                  <button type="button" onClick={() => planningMode ? movePlanningPlace(index, -1) : movePlace(index, -1)} disabled={(planningMode ? activeDayPlaces[0]?.index === index : index === 0) || pending} aria-label="장소를 앞으로 이동"><Icon name="arrow-up" /><span>앞으로</span></button>
                  <button type="button" onClick={() => planningMode ? movePlanningPlace(index, 1) : movePlace(index, 1)} disabled={(planningMode ? activeDayPlaces.at(-1)?.index === index : index === places.length - 1) || pending} aria-label="장소를 뒤로 이동"><Icon name="arrow-down" /><span>뒤로</span></button>

                </div>
              </div>
              <div className="travel-editor__fields">
                <label><span>나라</span><select value={place.countryCode} onChange={(event) => updateCountry(index, event.target.value)} required>{countries.map((country) => <option key={country.iso2Code} value={country.iso2Code}>{country.label}</option>)}</select></label>
                {expandedPlace === place.key ? <PlaceLocationPicker
                  focusSearch={newPlaceKey === place.key}
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
                  onSelect={(location) => { updateLocation(index, location); setNewPlaceKey(null); }}
                /> : null}
                <label><span>도시</span><input value={place.cityName} onChange={(event) => updateCityName(index, event.target.value)} maxLength={100} placeholder="예: 서울" /></label>
                <label className="is-wide"><span>장소 이름</span><input value={place.placeName} onChange={(event) => updatePlace(index, "placeName", event.target.value)} maxLength={150} placeholder="예: 서울숲" required /></label>
                <label><span>방문일</span><input value={place.visitedAt} onChange={(event) => updatePlace(index, "visitedAt", event.target.value)} type="date" /></label>
                {planningMode ? <div className="travel-editor__time-fields is-wide">
                  <label><span>시작 시간</span><input value={place.startTime} onChange={(event) => updatePlace(index, "startTime", event.target.value)} type="time" step="900" /></label>
                  <label><span>머무는 시간</span><select value={place.durationMinutes} onChange={(event) => updatePlace(index, "durationMinutes", event.target.value)}><option value="">미정</option><option value="30">30분</option><option value="45">45분</option><option value="60">1시간</option><option value="75">1시간 15분</option><option value="90">1시간 30분</option><option value="120">2시간</option><option value="180">3시간</option><option value="240">4시간</option></select></label>
                  <output><span>예상 종료</span><strong>{estimatedEndTime(place.startTime, place.durationMinutes) || "시간을 정하면 계산돼요"}</strong></output>
                </div> : null}
                <label className="is-wide"><span>메모</span><textarea id={index === quickNoteIndex ? "travel-note-editor" : undefined} value={place.memo} onChange={(event) => updatePlace(index, "memo", event.target.value)} maxLength={1000} rows={3} placeholder={planningMode ? "예약, 먹고 싶은 메뉴, 이동 팁" : "그 장소에서 기억하고 싶은 장면"} /></label>
              </div>
              <div className="editor-stop__footer">
                {places.length > 1 ? <button type="button" className="editor-stop__delete" disabled={pending} onClick={() => removePlace(index)}><Icon name="trash" />장소 삭제</button> : <span />}
                <button type="button" onClick={() => setExpandedPlace(null)}>편집 닫기</button>
              </div>
              </div>
            </li>
          ))}
        </ol>
        {planningMode ? <VisitOrderSuggestion key={activePlanDate} disabled={pending}
          stops={activeDayPlaces.map(({ place }) => ({ key: place.key, placeName: place.placeName, latitude: isPlanningPlaceholder(place) ? null : coordinate(place.latitude), longitude: coordinate(place.longitude), startTime: place.startTime }))}
          onApply={applyVisitOrder} /> : null}
        <GoogleDirectionsPanel compact
          activeDate={planningMode ? activePlanDate : undefined}
          stops={(planningMode ? activeDayPlaces.map(({ place }) => place) : places).map((place) => ({
            key: place.key, placeName: place.placeName,
            latitude: coordinate(place.latitude), longitude: coordinate(place.longitude), visitedAt: place.visitedAt,
          }))}
        />
        {!planningMode ? <div className="travel-editor__add-row"><p>방문 순서를 바꾸면 Google Maps 경로에도 바로 반영됩니다.</p><button type="button" onClick={() => { const next = emptyPlace(places.at(-1)?.countryCode ?? "KR"); setPlaces((current) => [...current, next]); setExpandedPlace(next.key); setDirty(true); }}><Icon name="plus" /> 장소 추가</button></div> : null}
        </div>
      </div></section>

      <section id={`${editorTabsId}-panel-${sectionTab(2)}`} role="tabpanel" aria-labelledby={`${editorTabsId}-tab-${sectionTab(2)}`} className="travel-editor__section" hidden={mobileEditorStep !== 2} data-mobile-active={mobileEditorStep === 2}><div id="travel-photo-editor">
        <div className="travel-editor__section-heading"><span>03</span><div><h2>여행 사진</h2><p>사진을 추가하고 방문 장소와 연결할 수 있습니다.</p></div></div>
        <label className="editor-trip-note"><span>여행 메모</span><textarea name="description" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={2000} rows={3} placeholder="기억해 둘 이야기나 여행 팁" /></label>
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
          <span className="travel-editor__dropzone-icon" aria-hidden="true"><Icon name="plus" /></span>
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
                    <button type="button" onClick={() => movePhoto(index, -1)} disabled={index === 0 || pending} aria-label="사진을 앞으로 이동"><Icon name="arrow-up" /><span>앞으로</span></button>
                    <button type="button" onClick={() => movePhoto(index, 1)} disabled={index === photos.length - 1 || pending} aria-label="사진을 뒤로 이동"><Icon name="arrow-down" /><span>뒤로</span></button>
                    {photo.imageUrl ? <button type="button" className={coverImageUrl === photo.imageUrl ? "is-cover" : ""} onClick={() => { setCoverImageUrl(photo.imageUrl); setDirty(true); }}>{coverImageUrl === photo.imageUrl ? "대표 사진" : "대표로 지정"}</button> : null}
                    <button type="button" onClick={() => removePhoto(index)} disabled={pending}>사진 삭제</button>
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
        ) : <div className="travel-editor__photo-empty">아직 사진이 없습니다.</div>}
        <div className="travel-editor__add-row"><p>다른 사이트에 이미 올린 사진이라면 주소로도 추가할 수 있어요.</p><button type="button" onClick={() => { setPhotos((current) => [...current, emptyPhoto()]); setDirty(true); }}><Icon name="plus" /> 이미지 주소로 추가</button></div>
      </div></section>

      {initialTravel ? <PlanSharePanel travelId={initialTravel.id} dirty={dirty} pendingSave={pending} /> : null}
      <footer className="editor-savebar">
        <div className="editor-savebar__status"><strong>{pending ? "저장 중…" : dirty ? "변경 내용이 있습니다" : editing ? "모든 변경 내용 저장됨" : "새 여행"}</strong><span aria-live="polite">{draftStatus}</span></div>
        <div className="editor-savebar__actions">
          <Link href="/studio">목록</Link>
          <button type="button" onClick={() => void handleSubmit()} disabled={pending}>{pending ? "저장 중…" : "저장"}</button>
        </div>
      </footer>
      <div className="editor-manage" aria-label="여행 관리">
        <div><strong>여행 관리</strong><p>여행 삭제와 임시 저장본 관리는 여기에서 할 수 있어요.</p></div>
        {editing ? <button type="button" onClick={handleDelete} className="destructive-action" disabled={pending}><Icon name="trash" />여행 삭제</button> : null}
        {draftRestored ? <button type="button" onClick={discardDraft} disabled={pending}><Icon name="refresh" />임시 저장본 버리기</button> : null}
      </div>
    </div>
  );
}

function DayWeather({ day }: { day: WeatherDay }) {
  const temperature = day.temperatureMax == null ? null : `${Math.round(day.temperatureMax)}°`;
  return (
    <em className={`plan-day-weather${isRainyDay(day) ? " is-rainy" : ""}`} data-source={day.source}
      title={`${WEATHER_SOURCE_LABEL[day.source]} · ${weatherLabel(day.weatherCode)}`}>
      <WeatherIcon code={day.weatherCode} />
      {temperature}
      <span className="sr-only">{` ${WEATHER_SOURCE_LABEL[day.source]} ${weatherLabel(day.weatherCode)}`}</span>
    </em>
  );
}
