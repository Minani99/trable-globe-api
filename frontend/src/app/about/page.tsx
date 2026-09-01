import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { globePath, siteConfig } from "@/lib/config";

export const metadata: Metadata = {
  title: "서비스 이야기",
  description: siteConfig.description,
};

const CAPABILITIES = [
  {
    number: "01",
    title: "여행 지구본",
    description: "방문한 국가와 도시, 이동 경로를 지구본에서 확인합니다.",
  },
  {
    number: "02",
    title: "여행 기록",
    description: "장소와 사진, 메모를 여행별로 정리합니다.",
  },
  {
    number: "03",
    title: "여행 계획",
    description: "일정과 예약 정보를 만들고 여행 후 기록으로 전환합니다.",
  },
  {
    number: "04",
    title: "공개 프로필",
    description: "공개한 지구본과 여행 기록을 한곳에서 공유합니다.",
  },
] as const;

export default function AboutPage() {
  return (
    <>
      <SiteHeader />

      <main id="main" className="about-page flex-1">
        <div className="site-shell">
          <header className="about-hero">
            <div className="about-hero__copy">
              <p className="eyebrow">PLAN · TRAVEL · RECORD</p>
              <h1>여행 계획과 기록을<br />한곳에서 관리하세요.</h1>
              <p>
                {siteConfig.name}에서 여행 일정을 만들고, 다녀온 국가와 도시, 이동 경로,
                사진과 메모를 지구본에 기록할 수 있습니다.
              </p>
              <div className="about-hero__actions">
                <Link href="/register?next=%2Fstudio" className="landing-primary-cta">
                  <span>계정 만들기</span>
                  <span className="landing-primary-cta__arrow" aria-hidden="true">↗</span>
                </Link>
                <Link href={globePath} className="landing-secondary-cta">샘플 지구본 보기</Link>
              </div>
            </div>
          </header>

          <section className="about-capabilities" aria-labelledby="available-heading">
            <div className="about-section-heading">
              <div>
                <h2 id="available-heading">지금 경험할 수 있는 것</h2>
              </div>
              <p>현재 베타에서 사용할 수 있는 주요 기능입니다.</p>
            </div>

            <ol className="about-capability-grid">
              {CAPABILITIES.map((item) => (
                <li key={item.number}>
                  <span>{item.number}</span>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </li>
              ))}
            </ol>
          </section>

        </div>
      </main>

      <SiteFooter />
    </>
  );
}
