import { CountryPhoto } from "@/components/common/CountryPhoto";
import Link from "next/link";
import { LandingGlobePreview } from "@/components/landing/LandingGlobePreview";
import { LandingOverview } from "@/components/landing/LandingOverview";
import { LandingStartAction } from "@/components/landing/LandingStartAction";
import { JournalPhoto } from "@/components/common/JournalPhoto";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";

import { chooseScene } from "@/lib/country-scenes";
import { RememberScene } from "@/components/landing/RememberScene";

export default async function LandingPage() {
  const { code, scene, example: companion } = await chooseScene();
  return (
    <>
      <SiteHeader />
      <RememberScene code={code} example={companion.id} />

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
                지구본에서 여행을 발견하고, 마음에 든 하루를 내 일정으로 가져오세요.
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
              <CountryPhoto code={code} sizes="(max-width: 700px) 100vw, (max-width: 1200px) 56vw, 680px" alt={`${scene.region} 여행 참고 사진`} />
              <figcaption><Link prefetch={false} href={`/photo-credits?q=${code}#${code}`}>사진 출처</Link></figcaption>
            </figure>
            <div className="landing-journal__copy">
              <p className="page-caption">여행 사진</p>
              <h2 id="landing-journal-heading">{scene.region}</h2>
              <Link href="/traveler">여행자의 기록 보기</Link>
              <figure className="journal-companion"><JournalPhoto photo={companion} sizes="(max-width: 700px) 40vw, 14rem" /><figcaption>{companion.region} · <a href={companion.source} target="_blank" rel="noreferrer">{companion.author}</a></figcaption></figure>
            </div>
          </section>
        </div>

        <LandingOverview example={companion.id} />
      </main>

      <SiteFooter compact />
    </>
  );
}
