/**
 * Server-side cache policy for anonymous, public API reads.
 *
 * Public profiles, trips and recommendations are read far more often than they change,
 * and every uncached read costs a round trip to the API host and its database (which may
 * both be waking from idle). Next.js keeps those responses in its data cache instead.
 *
 * Freshness is kept by invalidation, not by waiting: every successful write that passes
 * through the same-origin BFF calls `invalidatePublicData()`, so an edit, a visibility
 * change or an account deletion is visible on the very next read. The time limit below is
 * only a safety net for changes that do not pass through this app (a seed, a manual fix).
 *
 * One shared tag is deliberate while the service is small: it cannot miss a dependency
 * (a like changes a trip, a follow changes two profiles, a rename changes every list).
 */
export const PUBLIC_DATA_TAG = "public-data";
export const PUBLIC_DATA_MAX_AGE_SECONDS = 300;

/** `fetch` options for a cacheable public GET on the server. */
export const publicDataFetchCache: { next: { revalidate: number; tags: string[] } } = {
  next: { revalidate: PUBLIC_DATA_MAX_AGE_SECONDS, tags: [PUBLIC_DATA_TAG] },
};

/**
 * Drops every cached public read. Call after a successful write, from a Route Handler.
 * `expire: 0` means the next read blocks on fresh data rather than serving a stale copy -
 * a trip switched to private must not be served again.
 */
export async function invalidatePublicData(): Promise<void> {
  const { revalidateTag } = await import("next/cache");
  revalidateTag(PUBLIC_DATA_TAG, { expire: 0 });
}
