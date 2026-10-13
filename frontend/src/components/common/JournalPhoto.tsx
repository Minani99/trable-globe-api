/** A locally hosted, responsive photograph. See public/images/journal/CREDITS.md. */
export function JournalPhoto({ className = "", priority = false }: { className?: string; priority?: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img className={className} src="/images/journal/kyoto.webp"
      srcSet="/images/journal/kyoto-small.webp 600w, /images/journal/kyoto.webp 1200w"
      sizes="(max-width: 700px) 100vw, 50vw" width={1200} height={1800}
      alt="아침 햇살이 드는 교토의 골목과 야사카 탑"
      loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : "auto"} decoding="async" />
  );
}
