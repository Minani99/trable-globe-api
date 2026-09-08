import type { TravelDetail } from "@/types";

const CACHE_PREFIX = "travel-globe:trip-cache:v1:";
const INDEX_PREFIX = "travel-globe:trip-index:v1:";
const QUEUE_PREFIX = "travel-globe:trip-queue:v1:";
const MAX_CACHED_TRAVELS = 5;

export interface CachedTravel {
  savedAt: string;
  travel: TravelDetail;
}

export interface QueuedPlaceUpdate {
  id: string;
  placeId: number;
  memo: string | null;
  completed: boolean;
  createdAt: string;
}

export function cacheTravel(username: string, travel: TravelDetail): void {
  const storage = getStorage();
  if (!storage) return;

  const savedAt = new Date().toISOString();
  try {
    storage.setItem(cacheKey(username, travel.id), JSON.stringify({ savedAt, travel } satisfies CachedTravel));
    const ids = readIndex(storage, username).filter((id) => id !== travel.id);
    ids.unshift(travel.id);
    const retained = ids.slice(0, MAX_CACHED_TRAVELS);
    storage.setItem(indexKey(username), JSON.stringify(retained));
    for (const staleId of ids.slice(MAX_CACHED_TRAVELS)) storage.removeItem(cacheKey(username, staleId));
  } catch {
    // Storage may be unavailable in private browsing or full on the device. The
    // online experience should continue even when offline caching is unavailable.
  }
}

export function readCachedTravel(username: string, travelId: number): CachedTravel | null {
  const storage = getStorage();
  if (!storage) return null;
  return parseCachedTravel(storage.getItem(cacheKey(username, travelId)));
}

export function readCachedCurrentTravel(username: string, today: string): CachedTravel | null {
  const storage = getStorage();
  if (!storage) return null;

  return readIndex(storage, username)
    .map((travelId) => parseCachedTravel(storage.getItem(cacheKey(username, travelId))))
    .filter((entry): entry is CachedTravel => Boolean(entry))
    .filter(({ travel }) => travel.startDate <= today && today <= travel.endDate)
    .sort((left, right) => Date.parse(right.savedAt) - Date.parse(left.savedAt))[0] ?? null;
}

export function queuePlaceUpdate(
  username: string,
  travelId: number,
  update: Omit<QueuedPlaceUpdate, "id" | "createdAt">,
): QueuedPlaceUpdate[] {
  const operation: QueuedPlaceUpdate = {
    ...update,
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    createdAt: new Date().toISOString(),
  };
  const queue = readQueuedPlaceUpdates(username, travelId).filter((item) => item.placeId !== update.placeId);
  queue.push(operation);
  writeQueue(username, travelId, queue);
  return queue;
}

export function readQueuedPlaceUpdates(username: string, travelId: number): QueuedPlaceUpdate[] {
  const storage = getStorage();
  if (!storage) return [];
  try {
    const parsed = JSON.parse(storage.getItem(queueKey(username, travelId)) ?? "[]") as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isQueuedPlaceUpdate);
  } catch {
    return [];
  }
}

export function removeQueuedPlaceUpdate(username: string, travelId: number, operationId: string): void {
  const queue = readQueuedPlaceUpdates(username, travelId).filter((item) => item.id !== operationId);
  writeQueue(username, travelId, queue);
}

export function removeQueuedUpdatesForPlace(username: string, travelId: number, placeId: number): void {
  const queue = readQueuedPlaceUpdates(username, travelId).filter((item) => item.placeId !== placeId);
  writeQueue(username, travelId, queue);
}

export function applyPlaceUpdate(
  travel: TravelDetail,
  placeId: number,
  memo: string | null,
  completed: boolean,
): TravelDetail {
  return {
    ...travel,
    places: travel.places.map((place) => place.id === placeId ? {
      ...place,
      memo,
      completedAt: completed ? place.completedAt ?? new Date().toISOString() : null,
    } : place),
  };
}

export function clearOfflineTravelData(username: string): void {
  const storage = getStorage();
  if (!storage) return;
  const encodedUsername = encodeURIComponent(username);
  for (let index = storage.length - 1; index >= 0; index -= 1) {
    const key = storage.key(index);
    if (key && (
      key.startsWith(`${CACHE_PREFIX}${encodedUsername}:`) ||
      key.startsWith(`${QUEUE_PREFIX}${encodedUsername}:`) ||
      key === `${INDEX_PREFIX}${encodedUsername}`
    )) storage.removeItem(key);
  }
}

function writeQueue(username: string, travelId: number, queue: QueuedPlaceUpdate[]): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    if (queue.length) storage.setItem(queueKey(username, travelId), JSON.stringify(queue));
    else storage.removeItem(queueKey(username, travelId));
  } catch {
    // The caller still keeps the optimistic state in memory and reports the
    // connectivity problem instead of crashing the travel screen.
  }
}

function readIndex(storage: Storage, username: string): number[] {
  try {
    const parsed = JSON.parse(storage.getItem(indexKey(username)) ?? "[]") as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((value): value is number => Number.isSafeInteger(value) && value > 0)
      : [];
  } catch {
    return [];
  }
}

function parseCachedTravel(value: string | null): CachedTravel | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<CachedTravel>;
    const travel = parsed.travel;
    if (
      typeof parsed.savedAt !== "string" ||
      !travel ||
      !Number.isSafeInteger(travel.id) ||
      typeof travel.startDate !== "string" ||
      typeof travel.endDate !== "string" ||
      !Array.isArray(travel.places) ||
      !Array.isArray(travel.photos)
    ) return null;
    return parsed as CachedTravel;
  } catch {
    return null;
  }
}

function isQueuedPlaceUpdate(value: unknown): value is QueuedPlaceUpdate {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<QueuedPlaceUpdate>;
  return typeof item.id === "string" &&
    Number.isSafeInteger(item.placeId) &&
    (typeof item.memo === "string" || item.memo === null) &&
    typeof item.completed === "boolean" &&
    typeof item.createdAt === "string";
}

function cacheKey(username: string, travelId: number): string {
  return `${CACHE_PREFIX}${encodeURIComponent(username)}:${travelId}`;
}

function indexKey(username: string): string {
  return `${INDEX_PREFIX}${encodeURIComponent(username)}`;
}

function queueKey(username: string, travelId: number): string {
  return `${QUEUE_PREFIX}${encodeURIComponent(username)}:${travelId}`;
}

function getStorage(): Storage | null {
  return typeof window === "undefined" ? null : window.localStorage;
}
