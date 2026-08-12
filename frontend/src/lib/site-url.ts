import "server-only";

/** Canonical origin used by metadata, sitemaps and social previews. */
export function getSiteUrl(): URL {
  const configured = process.env.SITE_URL?.trim();
  const vercelHost =
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() || process.env.VERCEL_URL?.trim();
  const origin = configured || (vercelHost ? `https://${vercelHost}` : "http://localhost:3000");
  return new URL(origin.replace(/\/+$/, ""));
}
