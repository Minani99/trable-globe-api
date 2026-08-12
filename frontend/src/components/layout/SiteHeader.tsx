import Link from "next/link";

import { profilePath, siteConfig } from "@/lib/config";

interface SiteHeaderProps {
  /** Handle to show on the right, when the page belongs to someone. */
  username?: string;
}

/**
 * Thin, fixed-height header. It stays out of the globe's way by design - no background
 * fill, only a hairline.
 */
export function SiteHeader({ username }: SiteHeaderProps) {
  return (
    <header className="site-header border-border-subtle/70 bg-background/76 sticky top-0 z-40 border-b backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-[1500px] items-center justify-between px-5 sm:px-8 lg:px-12 xl:px-14">
        <Link
          href="/"
          className="site-wordmark text-content flex items-center gap-3 text-[0.76rem] font-medium tracking-[0.24em]"
        >
          <span className="site-wordmark__mark" aria-hidden="true" />
          {siteConfig.wordmark}
        </Link>

        <nav aria-label="주요 메뉴">
          <ul className="text-content-muted flex items-center gap-6 text-[0.8rem]">
            <li>
              <Link
                href={profilePath(siteConfig.demoUsername)}
                className="site-nav-link"
              >
                둘러보기
              </Link>
            </li>
            <li>
              <Link href="/about" className="site-nav-link">
                소개
              </Link>
            </li>
            {username ? (
              <li>
                <Link
                  href={profilePath(username)}
                  className="text-content border-border-strong rounded-full border px-3 py-1 transition-colors hover:border-[var(--accent-border)] hover:text-[var(--accent-strong)]"
                >
                  @{username}
                </Link>
              </li>
            ) : null}
          </ul>
        </nav>
      </div>
    </header>
  );
}
