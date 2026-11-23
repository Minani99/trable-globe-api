import type { JournalImage } from "@/lib/journal-photos";

export function JournalPhoto({ photo, className = "", priority = false, sizes = "(max-width: 700px) 100vw, 50vw" }: {
  photo: JournalImage; className?: string; priority?: boolean; sizes?: string;
}) {
  const base = `/images/journal/${photo.id}`;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img className={className} src={`${base}.webp`} srcSet={`${base}-small.webp 600w, ${base}.webp 1200w`}
      sizes={sizes} width={1200} height={photo.height} alt={photo.alt}
      loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : "auto"} decoding="async" />
  );
}
