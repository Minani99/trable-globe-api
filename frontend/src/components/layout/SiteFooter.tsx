import Link from "next/link";

import { globePath, siteConfig } from "@/lib/config";

export function SiteFooter() {
  return (
    <footer className="border-border-subtle/70 mt-24 border-t">
      <div className="site-shell text-content-faint flex flex-col gap-5 py-8 text-[0.75rem] sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="tracking-[0.18em] uppercase">{siteConfig.wordmark}</p>
          <p className="mt-1">{siteConfig.tagline}</p>
        </div>
        <nav aria-label="하단 메뉴">
          <ul className="flex items-center gap-5">
            <li>
              <Link className="transition-colors hover:text-[var(--text-primary)]" href={globePath}>
                여행 지구본
              </Link>
            </li>
            <li>
              <Link className="transition-colors hover:text-[var(--text-primary)]" href="/about">
                Travel Globe 소개
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}
