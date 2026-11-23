"use client";

import { useState } from "react";
import { destinationPhoto } from "@/lib/journal-photos";
import catalog from "@/lib/country-photo-index.json";
import { JournalPhoto } from "./JournalPhoto";
import { JourneyMapArt } from "./JourneyMapArt";

interface TravelImageProps {
  src: string | null;
  alt: string;
  className?: string;
  fallbackLabel?: string;
  avatarKey?: string;
  city?: string | null;
  country?: string | null;
  priority?: boolean;
  fallbackVariant?: "tile" | "map";
}

const inks = [
  ["#f4e4d8", "#763a20"], ["#dce8e2", "#245342"], ["#dfe7f0", "#344e70"],
  ["#eee1e8", "#6a3856"], ["#ede8ce", "#5d5028"], ["#e7e2f1", "#53416f"],
];

export function TravelImage({ src, alt, className = "", fallbackLabel, avatarKey, city, country, priority, fallbackVariant = "tile" }: TravelImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  if (src && src !== failedSrc) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} loading={priority ? "eager" : "lazy"} decoding="async" onError={() => setFailedSrc(src)} className={className} />;
  }

  if (fallbackVariant === "map") {
    const code = country?.trim().toUpperCase() ?? "";
    const photo = destinationPhoto(city, code);
    const countryScene = catalog.includes(code);
    const caption = photo ? "지역 참고 사진" : "국가·지역 참고 사진";
    return <div role="img" aria-label={photo || countryScene ? `${alt} · ${caption}` : alt}
      data-fallback={photo || countryScene ? "destination" : "map"} className={`tg-cover-art ${className}`}>
      {photo ? <><JournalPhoto photo={photo} priority={priority} sizes="(max-width: 700px) 100vw, 50vw" />
        <small aria-hidden="true">{caption}</small></> : countryScene ? <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/images/countries/${code}.webp`} alt="" loading={priority ? "eager" : "lazy"} decoding="async" />
          <small aria-hidden="true">{caption}</small>
        </> : <JourneyMapArt seed={alt} fill />}
    </div>;
  }

  const identity = avatarKey || fallbackLabel || alt;
  const hash = Array.from(identity).reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0, 0);
  const [background, color] = inks[hash % inks.length];
  return <div role={alt ? "img" : undefined} aria-label={alt || undefined} aria-hidden={alt ? undefined : true}
    className={`tg-monogram ${className}`} style={{ background, color }}>
    <span aria-hidden="true">{fallbackLabel || "·"}</span>
  </div>;
}
