import { apiGet } from "@/lib/api/client";
import type {
  ProfileRecapCustomization,
  TravelSummary,
  UserProfile,
  VisitedCountry,
} from "@/types";

const base = (username: string) => `/api/profiles/${encodeURIComponent(username)}`;

export function fetchProfile(username: string): Promise<UserProfile> {
  return apiGet<UserProfile>(base(username));
}

export function fetchVisitedCountries(username: string): Promise<VisitedCountry[]> {
  return apiGet<VisitedCountry[]>(`${base(username)}/countries`);
}

export function fetchTravels(username: string): Promise<TravelSummary[]> {
  return apiGet<TravelSummary[]>(`${base(username)}/travels`);
}

export function fetchProfileRecaps(username: string): Promise<ProfileRecapCustomization[]> {
  return apiGet<ProfileRecapCustomization[]>(`${base(username)}/recaps`);
}

export function fetchTravelsByCountry(username: string, iso2Code: string): Promise<TravelSummary[]> {
  return apiGet<TravelSummary[]>(
    `${base(username)}/countries/${encodeURIComponent(iso2Code)}/travels`,
  );
}
