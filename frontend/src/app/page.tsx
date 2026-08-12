import Link from "next/link";

import { LandingGlobePreview } from "@/components/landing/LandingGlobePreview";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { profilePath, siteConfig } from "@/lib/config";

export default function LandingPage() {
  return (
    <>
      <SiteHeader />

      <main id="main" className="flex flex-1 flex-col overflow-hidden">
        <section className="landing-hero relative mx-auto grid min-h-[calc(100svh-3.5rem)] w-full max-w-[1500px] flex-1 items-center gap-12 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[minmax(0,0.82fr)_minmax(520px,1.18fr)] lg:gap-4 lg:px-12 lg:py-14 xl:px-14">
          <div className="landing-copy relative z-10">
            <p className="eyebrow landing-reveal landing-reveal--eyebrow mb-6 flex items-center gap-3">
              <span className="landing-signal" aria-hidden="true" />
              Personal travel archive · 01
            </p>

            <h1 className="landing-title text-content max-w-[12ch]">
              <span className="landing-title-line landing-title-line--one">다녀온 세계를,</span>
              <span className="landing-title-line landing-title-line--two">하나의 지구본에.</span>
            </h1>

            <p className="text-body landing-reveal landing-reveal--body mt-8 max-w-[44ch] text-[1rem] sm:text-[1.05rem]">
              나라는 점이 되고, 도시는 경로가 되고, 사진은 다시 꺼내볼 장면이 됩니다.
              당신의 여행이 쌓일수록 지구본은 더 선명한 이야기로 완성됩니다.
            </p>

            <div className="landing-reveal landing-reveal--actions mt-10 flex flex-wrap items-center gap-3">
              <Link
                href={profilePath(siteConfig.demoUsername)}
                className="landing-primary-cta group"
              >
                <span>나의 세계 미리 보기</span>
                <span className="landing-primary-cta__arrow" aria-hidden="true">↗</span>
              </Link>
              <Link
                href="/about"
                className="landing-secondary-cta"
              >
                서비스 이야기
              </Link>
            </div>

            <dl className="landing-stats landing-reveal landing-reveal--stats mt-11 grid max-w-[460px] grid-cols-3">
              <Stat value="04" label="다녀온 나라" />
              <Stat value="07" label="기억한 도시" />
              <Stat value="05" label="여행 이야기" />
            </dl>
          </div>

          <LandingGlobePreview href={profilePath(siteConfig.demoUsername)} />

          <div className="landing-scroll-cue" aria-hidden="true">
            <span>SCROLL TO REMEMBER</span>
            <span className="landing-scroll-cue__line" />
          </div>
        </section>

        <section
          aria-labelledby="experience-heading"
          className="landing-experience mx-auto w-full max-w-[1400px] px-5 pb-10 sm:px-8 sm:pb-16"
        >
          <div className="hairline grid gap-10 pt-10 md:grid-cols-[0.62fr_1.38fr] md:gap-16">
            <div>
              <p className="eyebrow mb-3">The experience</p>
              <h2 id="experience-heading" className="text-heading text-content max-w-[12ch]">
                기억은 목록보다 입체적이니까.
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
