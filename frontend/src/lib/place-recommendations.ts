export const PLACE_RECOMMENDATION_CATEGORIES = ["activity", "food", "cafe", "stay"] as const;

export type PlaceRecommendationCategory = (typeof PLACE_RECOMMENDATION_CATEGORIES)[number];

export interface PlaceRecommendation {
  id: string;
  name: string;
  city: string;
  label: string;
  latitude: number;
  longitude: number;
  distanceKm: number;
  categoryLabel: string;
  recommendationReason: string;
  openingHours: string | null;
  cuisine: string | null;
  stars: string | null;
}
