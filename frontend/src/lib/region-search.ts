/** Administrative names prevent city nicknames matching unrelated shops or stations. */
const KOREAN_REGIONS: Record<string, string> = {
  서울: "서울특별시", 부산: "부산광역시", 제주: "제주특별자치도", 강릉: "강릉시",
  속초: "속초시", 경주: "경주시", 전주: "전주시", 여수: "여수시", 가평: "가평군",
  서귀포: "서귀포시", 수원: "수원시", 대구: "대구광역시", 대전: "대전광역시",
  인천: "인천광역시", 울산: "울산광역시", 세종: "세종특별자치시",
};

export function regionQuery(query: string, country: string): string {
  if (country !== "kr") return query;
  return query.split(/\s+/).map(part => KOREAN_REGIONS[part] ?? part).join(" ");
}

export const REGION_TYPES = new Set(["state", "province", "region", "county", "city", "town", "village", "municipality", "hamlet", "suburb", "quarter", "neighbourhood", "administrative"]);
