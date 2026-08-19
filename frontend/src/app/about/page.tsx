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
    title: "지구본으로 한눈에",
    description: "방문한 나라와 여행 횟수를 한 화면에서 보고, 내가 건너온 세계의 모양을 확인합니다.",
  },
  {
    number: "02",
    title: "나라별로 모아보기",
    description: "한 나라를 선택해 그곳에서 남긴 여행과 도시, 장면만 이어서 살펴봅니다.",
  },
  {
    number: "03",
    title: "경로를 따라 다시 걷기",
    description: "확대할 수 있는 지도와 방문 순서, 메모를 따라 여행의 흐름을 되짚어 봅니다.",
  },
  {
    number: "04",
    title: "나의 세계 공유하기",
    description: "하나의 공개 주소로 지구본과 여행 기록을 보여주는 나만의 여행 아카이브를 만듭니다.",
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
              <h1>여행을 목록이 아니라, 살아온 세계로 남깁니다.</h1>
              <p>
                {siteConfig.name}는 다녀온 나라와 도시, 그날의 경로와 장면을 하나의 3D
                지구본에 모읍니다. 한 나라를 고르고, 그곳의 여행을 따라가며, 잊고 있던 순간을
                다시 꺼내 볼 수 있는 개인 아카이브를 만들고 있습니다.
              </p>
              <div className="about-hero__actions">
                <Link href="/register" className="landing-primary-cta">
                  <span>내 지구본 시작하기</span>
                  <span className="landing-primary-cta__arrow" aria-hidden="true">↗</span>
                </Link>
                <Link href={globePath} className="landing-secondary-cta">샘플 둘러보기</Link>
              </div>
            </div>
          </header>

          <section className="about-capabilities" aria-labelledby="available-heading">
            <div className="about-section-heading">
              <div>
                <h2 id="available-heading">지금 경험할 수 있는 것</h2>
              </div>
              <p>지구본에서 여행 기록까지, 기억을 탐색하는 흐름을 하나로 이었습니다.</p>
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
