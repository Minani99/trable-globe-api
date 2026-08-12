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
  tagline: "다녀온 세계를 오래 꺼내보는 방법",
  description:
    "다녀온 나라와 도시, 그날의 경로와 사진을 하나의 지구본에 모아 오래 꺼내보는 개인 여행 아카이브.",
  /** Profile the landing page links to until sign-up exists. */
  demoUsername: "traveler",
} as const;

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

/** Travel detail path within a profile. */
export function travelPath(username: string, travelId: number): string {
  return `/${encodeURIComponent(username)}/travel/${travelId}`;
}
