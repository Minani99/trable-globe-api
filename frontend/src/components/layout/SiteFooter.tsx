import { siteConfig } from "@/lib/config";

export function SiteFooter() {
  return (
    <footer className="border-border-subtle/70 mt-24 border-t">
      <div className="text-content-faint mx-auto flex w-full max-w-[1400px] flex-col gap-2 px-5 py-8 text-[0.75rem] sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p className="tracking-[0.18em] uppercase">{siteConfig.wordmark}</p>
        <p>{siteConfig.tagline}</p>
      </div>
    </footer>
  );
}
