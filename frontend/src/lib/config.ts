/**
 * Single place to change the product name and API location.
 *
 * The brand is provisional, so it is never hard coded in a component - renaming the
 * service should be one edit here.
 */
export const siteConfig = {
  name: "Travel Globe",
  /** Header lockup - rendered as-is, so keep the spacing intentional. */
  wordmark: "TRAVEL GLOBE",
  tagline: "여행할수록, 나만의 세계가 만들어집니다",
  description:
    "방문한 국가와 도시, 이동한 길과 기억을 하나의 3D 지구본에 쌓아 나만의 여행 세계를 만드는 서비스입니다.",
  /** Profile the landing page links to until sign-up exists. */
  demoUsername: "traveler",
} as const;

/** Session-aware entry point: signed-in members go to their globe, guests to the sample. */
export const globePath = "/globe";

const DEFAULT_API_BASE_URL = "http://localhost:8080";

/**
 * Base URL of the Spring Boot API.
 *
 * Browsers default to the same-origin Next.js proxy. Server Components use `API_BASE_URL`
 * (localhost in development). `NEXT_PUBLIC_API_BASE_URL` remains an opt-in direct URL for
 * deployments that intentionally expose the API on a separate origin.
 */
export function getApiBaseUrl(): string {
  const publicUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (publicUrl) {
    return publicUrl.replace(/\/+$/, "");
  }

  // Browsers use the same-origin /api rewrite, so LAN clients never call their own localhost.
  if (typeof window !== "undefined") {
    return "";
  }

  const serverUrl = process.env.API_BASE_URL?.trim();
  return (serverUrl || DEFAULT_API_BASE_URL).replace(/\/+$/, "");
}

/** Public profile path for a handle, e.g. `/traveler`. */
export function profilePath(username: string): string {
  return `/${encodeURIComponent(username)}`;
}

/** Dynamic social preview for a profile or one of its yearly recaps. */
export function profileRecapImagePath(username: string, year: number | null): string {
  const params = new URLSearchParams({ username });
  if (year !== null) params.set("year", String(year));
  return `/api/og/profile?${params.toString()}`;
}

/** Travel detail path within a profile. */
export function travelPath(username: string, travelId: number): string {
  return `/${encodeURIComponent(username)}/travel/${travelId}`;
}
