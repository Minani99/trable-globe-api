import { apiGet } from "@/lib/api/client";
import type { TravelDetail, TravelSocial } from "@/types";

export function fetchTravelDetail(travelId: number): Promise<TravelDetail> {
  return apiGet<TravelDetail>(`/api/travels/${travelId}`);
}

export function fetchTravelSocial(travelId: number): Promise<TravelSocial> {
  return apiGet<TravelSocial>(`/api/travels/${travelId}/social`);
}
