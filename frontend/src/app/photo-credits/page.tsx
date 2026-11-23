import type { Metadata } from "next";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { countryCredits } from "@/lib/country-scenes";
import { journalPhotos } from "@/lib/journal-photos";

export const metadata: Metadata = { title: "사진 출처" };

export default function PhotoCreditsPage() {
  const scenes = Object.entries(countryCredits).sort(([, a], [, b]) => a.region.localeCompare(b.region, "ko"));
  return <>
    <SiteHeader />
    <main id="main" className="photo-credits site-shell">
      <h1>사진 출처</h1>
      <p>여행 표지와 예시에 사용하는 사진입니다. 원본을 WebP로 변환하고 크기를 줄였으며, 화면 비율에 맞춰 일부를 잘라 표시합니다. 각 변환본에도 아래에 표시된 원본의 이용 조건이 적용됩니다.</p>
      <h2>여행지 촬영 사진</h2>
      <ul>{journalPhotos.map(photo => <li key={photo.id}>
        <strong>{photo.region}</strong> · {photo.author} · <a href={photo.source}>원본 사진</a> · <a href="https://unsplash.com/license">Unsplash License</a>
      </li>)}</ul>
      <h2>국가·지역별 기본 이미지</h2>
      <ul>{scenes.map(([code, item]) => <li key={code} id={code}>
        <strong>{item.region}</strong>
        <p>{item.attribution || item.author}{item.attribution && item.attribution !== item.author ? ` · ${item.author}` : ""}</p>
        {item.credit && item.credit !== "Own work" && <p>{item.credit}</p>}
        <a href={item.source}>{item.title}</a> · <a href={item.licenseUrl}>{item.license}</a>
      </li>)}</ul>
    </main>
    <SiteFooter compact />
  </>;
}
