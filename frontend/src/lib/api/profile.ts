import { apiGet } from "@/lib/api/client";
import type {
  ProfileRecapCustomization,
  TravelSummary,
  UserProfile,
  VisitedCountry,
} from "@/types";

const base = (username: string) => `/api/profiles/${encodeURIComponent(username)}`;

// Share requests that are currently running. In the browser a completed read is never
// kept, so returning after editing a trip asks again; the server answers from its data
// cache, which every write clears (see `public-cache.ts`).
const pendingReads = new Map<string, Promise<unknown>>();
function sharedProfileRead<T>(path: string): Promise<T> {
  const pending = pendingReads.get(path);
  if (pending) return pending as Promise<T>;
  const request = apiGet<T>(path).finally(() => {
    if (pendingReads.get(path) === request) pendingReads.delete(path);
  });
  pendingReads.set(path, request);
  return request;
}

export function fetchProfile(username: string): Promise<UserProfile> {
  return sharedProfileRead<UserProfile>(base(username));
}

export function fetchVisitedCountries(username: string): Promise<VisitedCountry[]> {
  return sharedProfileRead<VisitedCountry[]>(`${base(username)}/countries`);
}

export function fetchTravels(username: string): Promise<TravelSummary[]> {
  return sharedProfileRead<TravelSummary[]>(`${base(username)}/travels`);
}

export function fetchProfileRecaps(username: string): Promise<ProfileRecapCustomization[]> {
  return apiGet<ProfileRecapCustomization[]>(`${base(username)}/recaps`);
}

export function fetchTravelsByCountry(username: string, iso2Code: string): Promise<TravelSummary[]> {
  return apiGet<TravelSummary[]>(
    `${base(username)}/countries/${encodeURIComponent(iso2Code)}/travels`,
  );
}
