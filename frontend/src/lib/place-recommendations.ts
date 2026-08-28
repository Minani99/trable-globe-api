export const PLACE_RECOMMENDATION_CATEGORIES = ["activity", "food", "cafe", "stay"] as const;

export type PlaceRecommendationCategory = (typeof PLACE_RECOMMENDATION_CATEGORIES)[number];

export const PLACE_RECOMMENDATION_DETAILS = {
  activity: [
    { id: "all", label: "전체", query: "명소" },
    { id: "landmark", label: "랜드마크", query: "랜드마크" },
    { id: "culture", label: "박물관·전시", query: "박물관" },
    { id: "nature", label: "공원·자연", query: "공원" },
    { id: "shopping", label: "시장·쇼핑", query: "시장" },
    { id: "family", label: "가족·체험", query: "가족 명소" },
  ],
  food: [
    { id: "all", label: "전체", query: "맛집" },
    { id: "local", label: "현지 음식", query: "현지 음식점" },
    { id: "korean", label: "한식", query: "한식당" },
    { id: "japanese", label: "일식", query: "일식당" },
    { id: "vegetarian", label: "채식", query: "채식 식당" },
    { id: "quick", label: "간단한 식사", query: "간편식" },
  ],
  cafe: [
    { id: "all", label: "전체", query: "카페" },
    { id: "coffee", label: "커피", query: "커피 전문점" },
    { id: "bakery", label: "베이커리", query: "베이커리 카페" },
    { id: "dessert", label: "디저트", query: "디저트 카페" },
    { id: "brunch", label: "브런치", query: "브런치 카페" },
  ],
  stay: [
    { id: "all", label: "전체", query: "숙소" },
    { id: "hotel", label: "호텔", query: "호텔" },
    { id: "hostel", label: "호스텔", query: "호스텔" },
    { id: "guest_house", label: "게스트하우스", query: "게스트하우스" },
    { id: "resort", label: "리조트", query: "리조트" },
    { id: "apartment", label: "아파트형", query: "아파트형 숙소" },
  ],
} as const;

export type PlaceRecommendationDetail =
  (typeof PLACE_RECOMMENDATION_DETAILS)[keyof typeof PLACE_RECOMMENDATION_DETAILS][number]["id"];

export interface PlaceRecommendation {
  id: string;
  name: string;
  nameLocale: "ko" | "en" | "local";
  localName: string | null;
  city: string;
  label: string;
  description: string;
  latitude: number;
  longitude: number;
  distanceKm: number;
  categoryLabel: string;
  recommendationReason: string;
  openingHours: string | null;
  cuisine: string | null;
  stars: string | null;
  features: string[];
}
