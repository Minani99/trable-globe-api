import Link from "next/link";

import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { profilePath, siteConfig } from "@/lib/config";

export default function LandingPage() {
  return (
    <>
      <SiteHeader />

      <main id="main" className="flex flex-1 flex-col">
        <section className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col justify-center px-5 py-24 sm:px-8">
          <p className="eyebrow mb-6">{siteConfig.wordmark}</p>

          <h1 className="text-display text-content max-w-[16ch]">
            내가 다녀온 세계를,
            <br />
            지구본 위에.
          </h1>

          <p className="text-body mt-7 max-w-[52ch] text-[1rem]">{siteConfig.description}</p>

          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Link
              href={profilePath(siteConfig.demoUsername)}
              className="rounded-full bg-[var(--accent)] px-5 py-2.5 text-[0.85rem] font-medium text-[#0b0705] transition-colors hover:bg-[var(--accent-strong)]"
            >
              지구본 살펴보기
            </Link>
            <Link
              href="/about"
              className="border-border-strong text-content-muted rounded-full border px-5 py-2.5 text-[0.85rem] transition-colors hover:border-[var(--accent-border)] hover:text-[var(--accent-strong)]"
            >
              서비스 소개
            </Link>
          </div>

          <dl className="hairline mt-20 grid max-w-[720px] grid-cols-1 gap-8 pt-10 sm:grid-cols-3">
            <Feature
              term="Personal globe"
              description="방문한 나라가 지구본 위에 색으로 남습니다."
            />
            <Feature
              term="Country to story"
              description="국가를 선택하면 그곳의 여행 기록으로 이어집니다."
            />
            <Feature
              term="Travel timeline"
              description="지금까지의 여행을 시간순으로 되짚어 봅니다."
            />
          </dl>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}

function Feature({ term, description }: { term: string; description: string }) {
  return (
    <div>
      <dt className="eyebrow mb-2">{term}</dt>
      <dd className="text-body text-[0.88rem]">{description}</dd>
    </div>
  );
}
