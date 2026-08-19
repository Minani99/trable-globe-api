/**
 * Mirrors the Spring Boot response DTOs.
 *
 * Field names match the Java records one for one, so a backend change surfaces here as a
 * type error rather than as `undefined` at runtime.
 */

export type Visibility = "PUBLIC" | "PRIVATE";

export interface TravelStatistics {
  countryCount: number;
  cityCount: number;
  travelCount: number;
  placeCount: number;
  firstTravelDate: string | null;
  latestTravelDate: string | null;
}

export interface UserProfile {
  username: string;
  displayName: string;
  bio: string | null;
  profileImageUrl: string | null;
  joinedAt: string;
  statistics: TravelStatistics;
}

/** A country the member has been to - the globe's marker source. */
export interface VisitedCountry {
  iso2Code: string;
  iso3Code: string;
  nameEn: string;
  nameKo: string;
  latitude: number;
  longitude: number;
  travelCount: number;
  cityCount: number;
  lastVisitedAt: string | null;
}

export interface CountryRef {
  iso2Code: string;
  iso3Code: string;
  nameEn: string;
  nameKo: string;
  latitude: number;
  longitude: number;
}

export interface CityRef {
  id: number;
  nameEn: string;
  nameKo: string;
  latitude: number;
  longitude: number;
}

export interface TravelSummary {
  id: number;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string;
  durationDays: number;
  coverImageUrl: string | null;
  primaryCountry: CountryRef | null;
  primaryCity: CityRef | null;
  countries: CountryRef[];
  placeCount: number;
  photoCount: number;
}

export interface TravelPlace {
  id: number;
  placeName: string;
  country: CountryRef;
  city: CityRef | null;
  /** Already resolved through the place - city - country fallback by the API. */
  latitude: number;
  longitude: number;
  visitedAt: string | null;
  memo: string | null;
  sortOrder: number;
}

export interface TravelPhoto {
  id: number;
  imageUrl: string;
  caption: string | null;
  takenAt: string | null;
  sortOrder: number;
  travelPlaceId: number | null;
}

export interface TravelOwner {
  username: string;
  displayName: string;
  profileImageUrl: string | null;
}

export interface TravelNavigationLink {
  id: number;
  title: string;
  startDate: string;
}

export interface TravelDetail {
  id: number;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string;
  durationDays: number;
  coverImageUrl: string | null;
  visibility: Visibility;
  owner: TravelOwner;
  countries: CountryRef[];
  places: TravelPlace[];
  photos: TravelPhoto[];
  /** The chronologically older trip, if any. */
  previousTravel: TravelNavigationLink | null;
  /** The chronologically newer trip, if any. */
  nextTravel: TravelNavigationLink | null;
}

export interface HealthStatus {
  status: string;
  serverTime: string;
}

export interface AuthMember {
  id: number;
  username: string;
  displayName: string;
  bio: string | null;
  profileImageUrl: string | null;
  email: string;
  emailVerified: boolean;
}

export interface SocialAuthor {
  username: string;
  displayName: string;
  profileImageUrl: string | null;
}

export interface TravelComment {
  id: number;
  author: SocialAuthor;
  content: string;
  createdAt: string;
  canDelete: boolean;
}

export interface TravelSocial {
  likeCount: number;
  likedByCurrentMember: boolean;
  commentCount: number;
  comments: TravelComment[];
}

export interface AccountActionResult {
  message: string;
  developmentToken: string | null;
  expiresAt: string | null;
}

export interface OwnedTravelSummary {
  travel: TravelSummary;
  visibility: Visibility;
  updatedAt: string;
}

export interface CountryWriteInput {
  iso2Code: string;
  iso3Code: string;
  nameEn: string;
  nameKo: string;
  latitude: number;
  longitude: number;
}

export interface CityWriteInput {
  nameEn: string;
  nameKo: string;
  latitude: number;
  longitude: number;
}

export interface TravelPlaceWriteInput {
  country: CountryWriteInput;
  city: CityWriteInput | null;
  placeName: string;
  latitude: number | null;
  longitude: number | null;
  visitedAt: string | null;
  memo: string | null;
}

export interface TravelPhotoWriteInput {
  imageUrl: string;
  caption: string | null;
  takenAt: string | null;
  placeIndex: number | null;
}

export interface TravelWriteInput {
  title: string;
  description: string | null;
  startDate: string;
  endDate: string;
  coverImageUrl: string | null;
  visibility: Visibility;
  places: TravelPlaceWriteInput[];
  photos: TravelPhotoWriteInput[];
}
