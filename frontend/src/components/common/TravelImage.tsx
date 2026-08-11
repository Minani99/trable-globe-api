"use client";

import { useState } from "react";

interface TravelImageProps {
  src: string | null;
  alt: string;
  className?: string;
  /** Text stamped on the generated fallback - a country code or city name reads best. */
  fallbackLabel?: string;
  priority?: boolean;
}

/**
 * Renders travel imagery, degrading to a generated tile when there is nothing to show.
 *
 * Both cases are handled here so no caller has to branch: a missing URL and a URL that
 * fails to load produce the same deterministic fallback, derived from the alt text so a
 * given trip always gets the same colour.
 *
 * Uses a plain `<img>` rather than `next/image` on purpose - the seeded URLs are SVGs and
 * later ones will come from arbitrary object storage, neither of which benefits from the
 * optimiser, and this keeps the remote-pattern allowlist out of the config for now.
 */
export function TravelImage({ src, alt, className = "", fallbackLabel, priority }: TravelImageProps) {
  const [failed, setFailed] = useState(false);
  const showFallback = !src || failed;

  if (showFallback) {
    const hue = hashToHue(fallbackLabel ?? alt);
    return (
      <div
        role="img"
        aria-label={alt}
        className={`relative flex items-center justify-center overflow-hidden ${className}`}
        style={{
          background: `linear-gradient(150deg,
            hsl(${hue} 34% 13%) 0%,
            hsl(${(hue + 28) % 360} 30% 9%) 58%,
            hsl(${(hue + 52) % 360} 26% 6%) 100%)`,
        }}
      >
        <span
          aria-hidden="true"
          className="text-[0.62rem] font-medium tracking-[0.3em] text-white/25 uppercase"
        >
          {fallbackLabel ?? "No image"}
        </span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}

/** Stable hue in [0, 360) so the same label always yields the same tile. */
function hashToHue(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) % 100000;
  }
  return hash % 360;
}
