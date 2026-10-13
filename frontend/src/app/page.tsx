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
        <section aria-labelledby="landing-title" className="landing-hero site-shell">
          <div className="landing-copy relative z-10">
            <p className="page-caption">나의 여행 노트</p>
            <h1 id="landing-title" className="landing-title text-content">
              <span className="landing-title-line landing-title-line--one">다음 여행을</span>{" "}
              <span className="landing-title-line landing-title-line--two">펼쳐보세요.</span>
            </h1>

            <p className="text-body landing-intro landing-reveal landing-reveal--body mt-7 max-w-[40ch]">
              일정을 정리하고, 다녀온 곳은 지구본에 남겨두세요.
              여행 전에도, 돌아온 뒤에도 꺼내 보는 나만의 노트.
            </p>

            <div className="landing-reveal landing-reveal--actions mt-10 flex flex-wrap items-center gap-3">
              <LandingStartAction />
            </div>
          </div>

          <figure className="landing-postcard">
            <JournalPhoto priority />
            <span className="landing-postcard__stamp" aria-hidden="true">한 장의 여행</span>
            <figcaption><span>JAPAN · KYOTO</span><strong>골목을 걷다,<br />여행이 시작됐다.</strong><a href="https://unsplash.com/photos/a-narrow-street-with-a-pagoda-in-the-background-yQvYgnh9XEg" target="_blank" rel="noreferrer">Photo · Filipe Freitas ↗</a></figcaption>
          </figure>
        </section>

        <section className="landing-world site-shell" aria-labelledby="landing-world-heading">
          <div className="landing-world__copy"><p className="page-caption">여행이 쌓이는 곳</p><h2 id="landing-world-heading">당신의 세계는<br />얼마나 넓어졌나요?</h2><p>다녀온 나라를 돌려보고,<br />그곳의 기억을 다시 열어보세요.</p><Link href="/traveler">샘플 여행자의 기록 <span aria-hidden="true">↗</span></Link></div>
          <LandingGlobePreview />
        </section>

        <LandingOverview />
      </main>

      <SiteFooter compact />
    </>
  );
}
