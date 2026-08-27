import type { ReactNode } from "react";

import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";

export function BetaInfoPage({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <>
      <SiteHeader />
      <main id="main" className="beta-info-page flex-1">
        <article className="site-shell beta-info">
          <header className="beta-info__hero">
            <p className="eyebrow">{eyebrow}</p>
            <h1>{title}</h1>
            <p>{intro}</p>
          </header>
          <div className="beta-info__content">{children}</div>
        </article>
      </main>
      <SiteFooter compact />
    </>
  );
}
