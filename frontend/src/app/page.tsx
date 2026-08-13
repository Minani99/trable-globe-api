import Link from "next/link";

import { LandingGlobePreview } from "@/components/landing/LandingGlobePreview";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { globePath } from "@/lib/config";

export default function LandingPage() {
  return (
    <>
      <SiteHeader />

      <main id="main" className="flex flex-1 flex-col overflow-hidden">
        <section className="landing-hero site-shell relative grid min-h-[calc(100svh-3.5rem)] flex-1 items-center gap-12 py-14 sm:py-20 lg:grid-cols-[minmax(0,0.82fr)_minmax(520px,1.18fr)] lg:gap-4 lg:py-14">
          <div className="landing-copy relative z-10">
            <p className="eyebrow landing-reveal landing-reveal--eyebrow mb-6 flex items-center gap-3">
              <span className="landing-signal" aria-hidden="true" />
              Personal travel archive
            </p>

            <h1 className="landing-title text-content max-w-[13ch]">
              <span className="landing-title-line landing-title-line--one">다녀온 세계를</span>{" "}
              <span className="landing-title-line landing-title-line--two">하나의 지구본에.</span>
            </h1>

            <p className="text-body landing-reveal landing-reveal--body mt-8 max-w-[44ch] text-[1rem] sm:text-[1.05rem]">
              방문한 나라는 좌표로, 도시 사이의 이동은 경로로 남습니다. 사진과 메모를
              더할수록 지구본은 나만의 여행 이야기가 됩니다.
            </p>

            <div className="landing-reveal landing-reveal--actions mt-10 flex flex-wrap items-center gap-3">
              <Link
                href={globePath}
                className="landing-primary-cta group"
              >
                <span>지구본 둘러보기</span>
                <span className="landing-primary-cta__arrow" aria-hidden="true">↗</span>
              </Link>
              <Link
                href="/about"
                className="landing-secondary-cta"
              >
                Travel Globe 알아보기
              </Link>
            </div>

            <dl className="landing-stats landing-reveal landing-reveal--stats mt-11 grid max-w-[460px] grid-cols-3">
              <Stat value="04" label="방문한 나라" />
              <Stat value="07" label="기록한 도시" />
              <Stat value="05" label="여행 기록" />
            </dl>
          </div>

          <LandingGlobePreview href={globePath} />

          <div className="landing-scroll-cue" aria-hidden="true">
            <span>아래로 이어보기</span>
            <span className="landing-scroll-cue__line" />
          </div>
        </section>

        <section
          aria-labelledby="experience-heading"
          className="landing-experience site-shell pb-10 sm:pb-16"
        >
          <div className="hairline grid gap-10 pt-10 md:grid-cols-[0.62fr_1.38fr] md:gap-16">
            <div>
              <p className="eyebrow mb-3">How it works</p>
              <h2 id="experience-heading" className="text-heading text-content max-w-[12ch]">
                여행을 한눈에, 기억은 한 장면씩.
              </h2>
            </div>

            <dl className="grid gap-8 sm:grid-cols-3">
              <Feature
                number="01"
                term="세계를 한눈에"
                description="방문한 나라와 여행 횟수를 지구본 위에서 확인합니다."
              />
              <Feature
                number="02"
                term="나라별로"
                description="선택한 나라에서 남긴 여행과 도시만 모아봅니다."
              />
              <Feature
                number="03"
                term="시간의 순서로"
                description="지도와 메모, 사진을 따라 한 번의 여행을 다시 걷습니다."
              />
            </dl>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <dt className="landing-stat-value">{value}</dt>
      <dd className="landing-stat-label">{label}</dd>
    </div>
  );
}

function Feature({ number, term, description }: { number: string; term: string; description: string }) {
  return (
    <div className="landing-feature group">
      <dt className="flex items-center gap-3">
        <span className="text-content-faint font-mono text-[0.65rem]">{number}</span>
        <span className="text-content text-[0.9rem] font-medium">{term}</span>
        <span className="landing-feature__arrow" aria-hidden="true">↗</span>
      </dt>
      <dd className="text-body mt-3 text-[0.86rem]">{description}</dd>
    </div>
  );
}
