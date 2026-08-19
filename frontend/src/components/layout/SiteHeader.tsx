import Link from "next/link";
import { Suspense } from "react";

import { BrandMark } from "@/components/brand/BrandMark";
import {
  HeaderNavigation,
  HeaderNavigationFallback,
} from "@/components/layout/HeaderNavigation";
import { siteConfig } from "@/lib/config";
import type { AuthMember } from "@/types";

interface SiteHeaderProps {
  /** Handle to show on the right, when the page belongs to someone. */
  username?: string;
  /** Avoids a second account request on pages that already loaded the signed-in member. */
  member?: AuthMember | null;
}

/**
 * Thin, fixed-height header. It stays out of the globe's way by design - no background
 * fill, only a hairline.
 */
export function SiteHeader({ username, member }: SiteHeaderProps) {
  return (
    <header className="site-header border-border-subtle/70 bg-background/76 sticky top-0 z-40 border-b backdrop-blur-xl">
      <div className="site-shell site-header__inner">
        <Link
          href="/"
          className="site-wordmark text-content flex items-center gap-3 text-[0.76rem] font-medium tracking-[0.24em]"
        >
          <span className="site-wordmark__mark">
            <BrandMark />
          </span>
          {siteConfig.wordmark}
        </Link>
        <Suspense fallback={<HeaderNavigationFallback />}>
          <HeaderNavigation username={username} initialMember={member} />
        </Suspense>
      </div>
    </header>
  );
}
