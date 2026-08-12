import type { Metadata } from "next";
import Link from "next/link";

import { BrandMark } from "@/components/brand/BrandMark";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { profilePath, siteConfig } from "@/lib/config";

export const metadata: Metadata = {
  title: "서비스 이야기",
  description: siteConfig.description,
};

const CAPABILITIES = [
  {
    number: "01",
    title: "한눈에 펼치는 세계",
    description: "방문한 나라와 여행 횟수를 지구본 위에서 보고, 내가 건너온 세계의 모양을 확인합니다.",
  },
  {
    number: "02",
    title: "한 나라씩 모아보기",
    description: "나라를 선택하면 그곳에서 남긴 여행과 도시, 장면만 이어서 살펴볼 수 있습니다.",
  },
  {
    number: "03",
    title: "경로를 따라 되짚기",
    description: "확대 가능한 지도와 방문 순서, 메모를 따라 여행의 흐름을 다시 만납니다.",
  },
  {
    number: "04",
    title: "나의 세계 공유하기",
    description: "하나의 공개 주소로 지구본과 여행 기록을 차분하게 보여주는 개인 아카이브입니다.",
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
              <p className="eyebrow">Why a globe</p>
              <h1>여행을 소비한 장소가 아니라, 살아온 세계로 남깁니다.</h1>
              <p>
                {siteConfig.name}은 다녀온 곳과 그날의 이야기를 3D 지구본에 모으는 개인 여행
                아카이브입니다. 여행이 끝난 뒤에도 내가 건너온 나라와 도시를 한눈에 펼쳐보고,
                한 장면씩 다시 들어갈 수 있도록 만들고 있습니다.
              </p>
              <div className="about-hero__actions">
                <Link href={profilePath(siteConfig.demoUsername)} className="landing-primary-cta">
                  <span>공개 지구본 둘러보기</span>
                  <span className="landing-primary-cta__arrow" aria-hidden="true">↗</span>
                </Link>
                <Link href="/" className="landing-secondary-cta">처음으로</Link>
              </div>
            </div>

            <figure className="about-world" aria-label="Travel Globe 시그니처 심벌">
              <div className="about-world__signature" aria-hidden="true">
                <span className="about-world__orbit about-world__orbit--one" />
                <span className="about-world__orbit about-world__orbit--two" />
                <BrandMark className="about-world__mark" />
                <span className="about-world__monogram">TG</span>
              </div>
              <figcaption>
                <span>PERSONAL WORLD · 01</span>
                <strong>기억은 좌표가 되고,<br />좌표는 다시 이야기가 됩니다.</strong>
              </figcaption>
            </figure>
          </header>

          <section className="about-capabilities" aria-labelledby="available-heading">
            <div className="about-section-heading">
              <div>
                <p className="eyebrow">Available now</p>
                <h2 id="available-heading">지금 할 수 있는 것</h2>
              </div>
              <p>여행을 단순한 목록보다 오래 꺼내볼 수 있는 형태로 정리합니다.</p>
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

          <section className="about-next" aria-labelledby="next-heading">
            <div>
              <p className="eyebrow">Next chapters</p>
              <h2 id="next-heading">누구나 자신의 지구본을 만들 수 있도록.</h2>
            </div>
            <div>
              <p>
                현재는 공개 아카이브를 읽는 경험에 집중한 첫 버전입니다. 다음 단계에서는 로그인,
                여행 작성, 사진 업로드와 공개 범위 설정을 더해 직접 기록할 수 있도록 확장합니다.
              </p>
              <span>{siteConfig.name}은 지금도 천천히 완성되고 있습니다.</span>
            </div>
          </section>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
