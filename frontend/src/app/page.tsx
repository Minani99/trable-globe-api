import Link from "next/link";
import { LandingGlobePreview } from "@/components/landing/LandingGlobePreview";
import { LandingOverview } from "@/components/landing/LandingOverview";
import { LandingStartAction } from "@/components/landing/LandingStartAction";
import { JournalPhoto } from "@/components/common/JournalPhoto";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";

import { journalPhotos } from "@/lib/journal-photos";

export const revalidate = 3600;

export default function LandingPage() {
  // This server-only edition is fixed in the ISR cache between regenerations.
  // eslint-disable-next-line react-hooks/purity
  const day = Math.floor((Date.now() + 9 * 3600000) / 86400000);
  const photo = journalPhotos[day % journalPhotos.length];
  const companion = journalPhotos[(day + 1) % journalPhotos.length];
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
              <JournalPhoto photo={photo} />
              <figcaption><a href={photo.source} target="_blank" rel="noreferrer">사진 · {photo.author}</a></figcaption>
            </figure>
            <div className="landing-journal__copy">
              <p className="page-caption">{photo.region}</p>
              <h2 id="landing-journal-heading">{photo.title}</h2>
              <Link href="/traveler">여행자의 기록 보기</Link>
              <figure className="journal-companion"><JournalPhoto photo={companion} sizes="(max-width: 700px) 40vw, 14rem" /><figcaption>{companion.region} · <a href={companion.source} target="_blank" rel="noreferrer">{companion.author}</a></figcaption></figure>
            </div>
          </section>
        </div>

        <LandingOverview />
      </main>

      <SiteFooter compact />
    </>
  );
}
