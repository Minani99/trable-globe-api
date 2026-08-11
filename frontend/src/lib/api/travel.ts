import { apiGet } from "@/lib/api/client";
import type { TravelDetail } from "@/types";

export function fetchTravelDetail(travelId: number): Promise<TravelDetail> {
  return apiGet<TravelDetail>(`/api/travels/${travelId}`);
}
