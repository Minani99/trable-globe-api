import Link from "next/link";
import { LandingGlobePreview } from "@/components/landing/LandingGlobePreview";
import { LandingOverview } from "@/components/landing/LandingOverview";
import { LandingStartAction } from "@/components/landing/LandingStartAction";
import { JournalPhoto } from "@/components/common/JournalPhoto";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";

export default function LandingPage() {
  return (
    <>
      <SiteHeader />

      <main id="main" className="landing-main landing-main--journal flex flex-1 flex-col overflow-hidden">
        {/* Each section is a full-width band so the globe, the story, planning, recording
            and browsing read as separate screens instead of one continuous column. */}
        <div className="landing-band landing-band--hero">
          <section aria-labelledby="landing-title" className="landing-hero site-shell">
            <div className="landing-copy relative z-10">
              <h1 id="landing-title" className="landing-title text-content">
                <span className="landing-title-line landing-title-line--one">여행이 쌓이는,</span>{" "}
                <span className="landing-title-line landing-title-line--two">나만의 지구본.</span>
              </h1>

              <p className="text-body landing-intro landing-reveal landing-reveal--body mt-7 max-w-[40ch]">
                지구본을 돌려 나라별 여행 기록을 살펴보세요.
              </p>
            </div>
            <LandingGlobePreview />
            <div className="landing-reveal landing-reveal--actions flex flex-wrap items-center gap-3">
              <LandingStartAction />
            </div>
          </section>
        </div>

        <div className="landing-band landing-band--journal" id="landing-journal">
          <section className="landing-journal site-shell" aria-labelledby="landing-journal-heading">
            <figure className="landing-postcard">
              <JournalPhoto />
              <figcaption><a href="https://unsplash.com/photos/a-narrow-street-with-a-pagoda-in-the-background-yQvYgnh9XEg" target="_blank" rel="noreferrer">사진 · Filipe Freitas</a></figcaption>
            </figure>
            <div className="landing-journal__copy">
              <p className="page-caption">일본 · 교토</p>
              <h2 id="landing-journal-heading">야사카 탑으로 이어지는 골목</h2>
              <Link href="/traveler">여행자의 기록 보기</Link>
            </div>
          </section>
        </div>

        <LandingOverview />
      </main>

      <SiteFooter compact />
    </>
  );
}
