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
              <p className="page-caption">나의 여행, 나의 세계</p>
              <h1 id="landing-title" className="landing-title text-content">
                <span className="landing-title-line landing-title-line--one">여행이 쌓이는,</span>{" "}
                <span className="landing-title-line landing-title-line--two">나만의 지구본.</span>
              </h1>

              <p className="text-body landing-intro landing-reveal landing-reveal--body mt-7 max-w-[40ch]">
                다녀온 나라를 색칠하고, 그곳의 기억을 열어보세요.
                다음 여행도 이곳에서 시작하세요.
              </p>
            </div>
            <LandingGlobePreview />
            <div className="landing-reveal landing-reveal--actions flex flex-wrap items-center gap-3">
              <LandingStartAction />
            </div>
          </section>
          <a className="landing-scroll-hint" href="#landing-journal">
            <span>아래로 더 보기</span>
            <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16"><path d="m6 9 6 6 6-6" /></svg>
          </a>
        </div>

        <div className="landing-band landing-band--journal" id="landing-journal">
          <section className="landing-journal site-shell" aria-labelledby="landing-journal-heading">
            <figure className="landing-postcard">
              <JournalPhoto />
              <figcaption><span>JAPAN · KYOTO</span><a href="https://unsplash.com/photos/a-narrow-street-with-a-pagoda-in-the-background-yQvYgnh9XEg" target="_blank" rel="noreferrer">Photo · Filipe Freitas ↗</a></figcaption>
            </figure>
            <div className="landing-journal__copy"><p className="page-caption">나라 하나, 기억 하나</p><h2 id="landing-journal-heading">지도 위의 한 점이<br />나만의 이야기가 되도록.</h2><p>골목에서 찍은 사진부터 다시 가고 싶은 장소까지.<br />여행의 순간을 지구본에 차곡차곡 남겨두세요.</p><Link href="/traveler">샘플 여행자의 기록 </Link></div>
          </section>
        </div>

        <LandingOverview />
      </main>

      <SiteFooter compact />
    </>
  );
}
