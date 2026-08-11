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
    <header className="border-border-subtle/70 bg-background/80 sticky top-0 z-40 border-b backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-[1400px] items-center justify-between px-5 sm:px-8">
        <Link
          href="/"
          className="text-content text-[0.78rem] font-medium tracking-[0.24em] transition-colors hover:text-[var(--accent-strong)]"
        >
          {siteConfig.wordmark}
        </Link>

        <nav aria-label="주요 메뉴">
          <ul className="text-content-muted flex items-center gap-6 text-[0.8rem]">
            <li>
              <Link
                href={profilePath(siteConfig.demoUsername)}
                className="transition-colors hover:text-[var(--text-primary)]"
              >
                Explore
              </Link>
            </li>
            <li>
              <Link href="/about" className="transition-colors hover:text-[var(--text-primary)]">
                About
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
