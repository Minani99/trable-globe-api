import type { Metadata } from "next";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { countryCredits } from "@/lib/country-scenes";
import { journalPhotos } from "@/lib/journal-photos";

export const metadata: Metadata = { title: "사진 출처" };

const englishNames = new Intl.DisplayNames(["en"], { type: "region" });
const regions = Object.entries(countryCredits).sort(([, a], [, b]) => a.region.localeCompare(b.region, "ko"));

export default async function PhotoCreditsPage({ searchParams }: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const { q } = await searchParams;
  const query = (Array.isArray(q) ? q[0] : q)?.trim() ?? "";
  const term = query.toLowerCase();
  const exactCode = Object.hasOwn(countryCredits, query.toUpperCase()) ? query.toUpperCase() : undefined;
  const scenes = regions.filter(([code, item]) => exactCode ? code === exactCode :
    item.region.includes(term) || englishNames.of(code)?.toLowerCase().includes(term)
  );
  const matchingCodes = new Set(scenes.map(([code]) => code));
  const photos = journalPhotos.filter(photo => matchingCodes.has(photo.country) ||
    [photo.region, ...photo.names].some(name => name.toLowerCase().includes(term)));
  return <>
    <SiteHeader />
    <main id="main" className="photo-credits site-shell">
      <h1>사진 출처</h1>
      <p>여행 표지와 예시에 사용하는 사진입니다. 원본을 WebP로 변환하고 크기를 줄였으며, 화면 비율에 맞춰 일부를 잘라 표시합니다. 각 변환본에도 아래에 표시된 원본의 이용 조건이 적용됩니다.</p>
      <form action="/photo-credits" role="search" className="photo-credit-search">
        <label htmlFor="photo-region">촬영 지역 검색</label>
        <input id="photo-region" name="q" type="search" defaultValue={query} placeholder="예: 강릉, 프랑스, FR" />
        <button type="submit">검색</button>
      </form>
      {query && <p>{photos.length + scenes.length}개 검색 결과 · <a href="/photo-credits">전체 보기</a></p>}
      {photos.length > 0 && <><h2>여행지 촬영 사진</h2>
      <ul>{photos.map(photo => <li key={photo.id}>
        <strong>{photo.region}</strong> · {photo.author} · <a href={photo.source}>원본 사진</a> · <a href="https://unsplash.com/license">Unsplash License</a>
      </li>)}</ul></>}
      {scenes.length > 0 && <><h2>국가·지역별 기본 이미지</h2>
      <ul>{scenes.map(([code, item]) => <li key={code} id={code}>
        <strong>{item.region}</strong>
        <p>{item.attribution || item.author}{item.attribution && item.attribution !== item.author ? ` · ${item.author}` : ""}</p>
        {item.credit && item.credit !== "Own work" && <p>{item.credit}</p>}
        <a href={item.source}>{item.title}</a> · <a href={item.licenseUrl}>{item.license}</a>
      </li>)}</ul></>}
    </main>
    <SiteFooter compact />
  </>;
}
