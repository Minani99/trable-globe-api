import Link from "next/link";

import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { profilePath, siteConfig } from "@/lib/config";

export default function LandingPage() {
  return (
    <>
      <SiteHeader />

      <main id="main" className="flex flex-1 flex-col overflow-hidden">
        <section className="landing-hero relative mx-auto grid w-full max-w-[1400px] flex-1 items-center gap-14 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[minmax(0,0.88fr)_minmax(480px,1.12fr)] lg:gap-10 lg:py-20">
          <div className="relative z-10">
            <p className="eyebrow mb-6">Personal travel archive · 01</p>

            <h1 className="text-display text-content max-w-[13ch]">
              다녀온 세계를,
              <br />
              하나의 지구본에.
            </h1>

            <p className="text-body mt-7 max-w-[48ch] text-[1rem] sm:text-[1.05rem]">
              나라는 점이 되고, 도시는 경로가 되고, 사진은 다시 꺼내볼 장면이 됩니다. 여행이
              쌓일수록 지구본은 점점 더 나다운 모양으로 완성됩니다.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Link
                href={profilePath(siteConfig.demoUsername)}
                className="rounded-full bg-[var(--accent)] px-5 py-2.5 text-[0.85rem] font-semibold text-[#130a06] transition-[background-color,transform] hover:-translate-y-0.5 hover:bg-[var(--accent-strong)]"
              >
                샘플 지구본 둘러보기
              </Link>
              <Link
                href="/about"
                className="border-border-strong text-content-muted rounded-full border px-5 py-2.5 text-[0.85rem] transition-colors hover:border-[var(--accent-border)] hover:text-[var(--accent-strong)]"
              >
                서비스 이야기
              </Link>
            </div>

            <p className="text-caption mt-5">회원가입 없이 공개 샘플을 바로 둘러볼 수 있습니다.</p>
          </div>

          <GlobePreview />
        </section>

        <section
          aria-labelledby="experience-heading"
          className="mx-auto w-full max-w-[1400px] px-5 pb-10 sm:px-8 sm:pb-16"
        >
          <div className="hairline grid gap-10 pt-10 md:grid-cols-[0.7fr_1.3fr] md:gap-16">
            <div>
              <p className="eyebrow mb-3">The experience</p>
              <h2 id="experience-heading" className="text-heading text-content max-w-[12ch]">
                목록보다 먼저, 세계를 펼쳐봅니다.
              </h2>
            </div>

            <dl className="grid gap-8 sm:grid-cols-3">
              <Feature
                number="01"
                term="한눈에"
                description="방문한 나라와 여행 횟수를 지구본에서 바로 확인합니다."
              />
              <Feature
                number="02"
                term="한 나라씩"
                description="나라를 고르면 그곳에서 남긴 여행과 장소만 이어서 봅니다."
              />
              <Feature
                number="03"
                term="다시, 시간순으로"
                description="경로와 사진, 메모를 따라 지난 여행을 천천히 되짚습니다."
              />
            </dl>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}

function GlobePreview() {
  return (
    <figure className="hero-visual relative mx-auto w-full max-w-[660px]" aria-labelledby="preview-caption">
      <div
        className="hero-orbit relative mx-auto aspect-square w-[min(88vw,590px)]"
        role="img"
        aria-label="여행 마커와 경로가 표시된 지구본 미리보기"
      >
        <div className="hero-orbit-ring hero-orbit-ring--outer" aria-hidden="true" />
        <div className="hero-orbit-ring hero-orbit-ring--inner" aria-hidden="true" />
        <div className="hero-globe" aria-hidden="true">
          <span className="hero-continent hero-continent--one" />
          <span className="hero-continent hero-continent--two" />
          <span className="hero-continent hero-continent--three" />
          <span className="hero-route" />
          <span className="hero-marker hero-marker--taipei" />
          <span className="hero-marker hero-marker--fukuoka" />
          <span className="hero-marker hero-marker--miami" />
        </div>
        <div className="hero-coordinate hero-coordinate--top" aria-hidden="true">
          25.0330° N · 121.5654° E
        </div>
        <div className="hero-coordinate hero-coordinate--bottom" aria-hidden="true">
          ROTATE · SELECT · RELIVE
        </div>
      </div>

      <figcaption id="preview-caption" className="hero-trip-card panel">
        <div>
          <p className="eyebrow">Latest memory</p>
          <p className="text-content mt-1 text-[0.95rem] font-medium">Taipei, again.</p>
        </div>
        <p className="text-content-faint font-mono text-[0.68rem]">3 DAYS · 3 PLACES</p>
      </figcaption>
    </figure>
  );
}

function Feature({ number, term, description }: { number: string; term: string; description: string }) {
  return (
    <div>
      <dt className="flex items-center gap-3">
        <span className="text-content-faint font-mono text-[0.65rem]">{number}</span>
        <span className="text-content text-[0.9rem] font-medium">{term}</span>
      </dt>
      <dd className="text-body mt-3 text-[0.86rem]">{description}</dd>
    </div>
  );
}
