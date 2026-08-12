import Link from "next/link";

import { profilePath, siteConfig } from "@/lib/config";

export function SiteFooter() {
  return (
    <footer className="border-border-subtle/70 mt-24 border-t">
      <div className="text-content-faint mx-auto flex w-full max-w-[1400px] flex-col gap-5 px-5 py-8 text-[0.75rem] sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div>
          <p className="tracking-[0.18em] uppercase">{siteConfig.wordmark}</p>
          <p className="mt-1">{siteConfig.tagline}</p>
        </div>
        <nav aria-label="하단 메뉴">
          <ul className="flex items-center gap-5">
            <li>
              <Link className="transition-colors hover:text-[var(--text-primary)]" href={profilePath(siteConfig.demoUsername)}>
                샘플 지구본
              </Link>
            </li>
            <li>
              <Link className="transition-colors hover:text-[var(--text-primary)]" href="/about">
                서비스 소개
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}
