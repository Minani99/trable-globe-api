import { apiGet, apiMutation, apiSessionGet } from "@/lib/api/client";
import type {
  FollowStatus,
  MemberConnection,
  MemberDiscovery,
  MemberReportReason,
  MemberReportReceipt,
  MemberSafetyStatus,
} from "@/types";

export type ConnectionKind = "followers" | "following";

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

export function fetchMemberConnections(
  username: string,
  kind: ConnectionKind,
  authenticated: boolean,
): Promise<MemberConnection[]> {
  const path = `/profiles/${encodeURIComponent(username)}/${kind}?limit=24`;
  return authenticated
    ? apiSessionGet<MemberConnection[]>(`/api/private/discovery${path}`)
    : apiGet<MemberConnection[]>(`/api/discovery${path}`);
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

export function blockMember(username: string): Promise<MemberSafetyStatus | null> {
  return apiMutation<MemberSafetyStatus>(
    `/api/private/discovery/profiles/${encodeURIComponent(username)}/block`,
    "POST",
  );
}

export function unblockMember(username: string): Promise<MemberSafetyStatus | null> {
  return apiMutation<MemberSafetyStatus>(
    `/api/private/discovery/profiles/${encodeURIComponent(username)}/block`,
    "DELETE",
  );
}

export function reportMember(
  username: string,
  reason: MemberReportReason,
  details: string,
): Promise<MemberReportReceipt | null> {
  return apiMutation<MemberReportReceipt>(
    `/api/private/discovery/profiles/${encodeURIComponent(username)}/report`,
    "POST",
    { reason, details: details.trim() || null },
  );
}
