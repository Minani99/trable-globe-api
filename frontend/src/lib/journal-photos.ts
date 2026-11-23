export const journalPhotos = [
  { id: "gangneung", city: "강릉", country: "KR", region: "강원 · 강릉", title: "옥계 바다의 수평선", alt: "강릉 옥계의 푸른 바다와 방파제 끝 빨간 등대", author: "Bundo Kim", source: "https://unsplash.com/photos/OXTnNcZXeqU", height: 1803, names: ["강릉", "gangneung"] },
  { id: "kyoto", city: "교토", country: "JP", region: "일본 · 교토", title: "야사카 탑으로 이어지는 골목", alt: "교토의 좁은 골목 너머로 보이는 야사카 탑", author: "Filipe Freitas", source: "https://unsplash.com/photos/yQvYgnh9XEg", height: 1800, names: ["교토", "kyoto", "京都"] },
  { id: "seoul", city: "서울", country: "KR", region: "서울 · 종로", title: "경복궁 처마 아래", alt: "겹겹의 단청과 기와가 보이는 서울 경복궁", author: "Harry Angara", source: "https://unsplash.com/photos/It1S2EHfACs", height: 1200, names: ["서울", "seoul"] },
  { id: "alps", city: "라이헤나우", country: "CH", region: "스위스 · 라이헤나우", title: "강을 건너는 빨간 열차", alt: "스위스 라이헤나우의 강 위 철교를 건너는 열차", author: "Fabian Kleiser", source: "https://unsplash.com/photos/H8xOpzXLHQo", height: 800, names: ["라이헤나우", "reichenau", "타민스", "tamins"] },
] as const;

export type JournalImage = typeof journalPhotos[number];

export function destinationPhoto(city?: string | null, country?: string | null) {
  const place = city?.trim().toLowerCase();
  return place ? journalPhotos.find(photo => (!country || photo.country === country) &&
    photo.names.some(name => place === name || place === `${name}시` || place.startsWith(`${name} `) || place.startsWith(`${name}-`))) : undefined;
}
