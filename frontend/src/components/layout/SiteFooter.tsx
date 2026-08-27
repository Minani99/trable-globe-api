import Link from "next/link";

import { FooterAccountLinks } from "@/components/layout/FooterAccountLinks";
import { globePath, siteConfig } from "@/lib/config";

export function SiteFooter({ compact = false }: { compact?: boolean }) {
  return (
    <footer className={`site-footer border-border-subtle/70 mt-24 border-t${compact ? " site-footer--compact" : ""}`}>
      <div className="site-shell text-content-faint flex flex-col gap-5 py-8 text-[0.75rem] sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="flex items-center gap-2 tracking-[0.18em] uppercase">
            {siteConfig.wordmark}
            <span className="site-footer__beta">BETA</span>
          </p>
          <p className="mt-1">{siteConfig.tagline}</p>
        </div>
        <nav aria-label="하단 메뉴">
          <ul className="flex flex-wrap items-center gap-x-5 gap-y-2">
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
            <li>
              <Link className="transition-colors hover:text-[var(--text-primary)]" href="/feedback">
                베타 의견
              </Link>
            </li>
            <li>
              <Link className="transition-colors hover:text-[var(--text-primary)]" href="/privacy">
                개인정보 안내
              </Link>
            </li>
            <li>
              <Link className="transition-colors hover:text-[var(--text-primary)]" href="/terms">
                베타 이용 안내
              </Link>
            </li>
            <FooterAccountLinks />
          </ul>
        </nav>
      </div>
    </footer>
  );
}
