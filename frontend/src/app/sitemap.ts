import type { MetadataRoute } from "next";

import { profilePath, siteConfig } from "@/lib/config";
import { getSiteUrl } from "@/lib/site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = getSiteUrl().origin;

  return [
    { url: origin, changeFrequency: "monthly", priority: 1 },
    { url: `${origin}/about`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${origin}/privacy`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${origin}/terms`, changeFrequency: "monthly", priority: 0.3 },
    {
      url: `${origin}${profilePath(siteConfig.demoUsername)}`,
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];
}
