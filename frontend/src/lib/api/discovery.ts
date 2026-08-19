import { apiGet, apiMutation, apiSessionGet } from "@/lib/api/client";
import type { FollowStatus, MemberDiscovery } from "@/types";

export function searchMembers(query: string, authenticated: boolean): Promise<MemberDiscovery[]> {
  const suffix = `?query=${encodeURIComponent(query)}&limit=16`;
  return authenticated
    ? apiSessionGet<MemberDiscovery[]>(`/api/private/discovery/search${suffix}`)
    : apiGet<MemberDiscovery[]>(`/api/discovery/search${suffix}`);
}

export function fetchRecommendations(): Promise<MemberDiscovery[]> {
  return apiSessionGet<MemberDiscovery[]>("/api/private/discovery/recommendations?limit=8");
}

export function fetchPublicRecommendations(): Promise<MemberDiscovery[]> {
  return apiGet<MemberDiscovery[]>("/api/discovery/recommendations?limit=8");
}

export function followMember(username: string): Promise<FollowStatus | null> {
  return apiMutation<FollowStatus>(
    `/api/private/discovery/profiles/${encodeURIComponent(username)}/follow`,
    "POST",
  );
}

export function unfollowMember(username: string): Promise<FollowStatus | null> {
  return apiMutation<FollowStatus>(
    `/api/private/discovery/profiles/${encodeURIComponent(username)}/follow`,
    "DELETE",
  );
}
