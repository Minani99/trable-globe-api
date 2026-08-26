export interface AirportOption {
  code: string;
  cityKo: string;
  cityEn: string;
  airportKo: string;
  countryKo: string;
  countryCode: string;
  popular?: boolean;
}

export const AIRPORT_OPTIONS: AirportOption[] = [
  { code: "SEL", cityKo: "서울", cityEn: "Seoul", airportKo: "서울 모든 공항", countryKo: "대한민국", countryCode: "KR", popular: true },
  { code: "ICN", cityKo: "인천", cityEn: "Seoul Incheon", airportKo: "인천국제공항", countryKo: "대한민국", countryCode: "KR", popular: true },
  { code: "GMP", cityKo: "서울", cityEn: "Seoul Gimpo", airportKo: "김포국제공항", countryKo: "대한민국", countryCode: "KR" },
  { code: "PUS", cityKo: "부산", cityEn: "Busan", airportKo: "김해국제공항", countryKo: "대한민국", countryCode: "KR" },
  { code: "CJU", cityKo: "제주", cityEn: "Jeju", airportKo: "제주국제공항", countryKo: "대한민국", countryCode: "KR" },
  { code: "TYO", cityKo: "도쿄", cityEn: "Tokyo", airportKo: "도쿄 모든 공항", countryKo: "일본", countryCode: "JP", popular: true },
  { code: "HND", cityKo: "도쿄", cityEn: "Tokyo Haneda", airportKo: "하네다공항", countryKo: "일본", countryCode: "JP" },
  { code: "NRT", cityKo: "도쿄", cityEn: "Tokyo Narita", airportKo: "나리타국제공항", countryKo: "일본", countryCode: "JP" },
  { code: "OSA", cityKo: "오사카", cityEn: "Osaka", airportKo: "오사카 모든 공항", countryKo: "일본", countryCode: "JP", popular: true },
  { code: "KIX", cityKo: "오사카", cityEn: "Osaka Kansai", airportKo: "간사이국제공항", countryKo: "일본", countryCode: "JP" },
  { code: "ITM", cityKo: "오사카", cityEn: "Osaka Itami", airportKo: "이타미공항", countryKo: "일본", countryCode: "JP" },
  { code: "FUK", cityKo: "후쿠오카", cityEn: "Fukuoka", airportKo: "후쿠오카공항", countryKo: "일본", countryCode: "JP" },
  { code: "CTS", cityKo: "삿포로", cityEn: "Sapporo Chitose", airportKo: "신치토세공항", countryKo: "일본", countryCode: "JP" },
  { code: "OKA", cityKo: "오키나와", cityEn: "Okinawa Naha", airportKo: "나하공항", countryKo: "일본", countryCode: "JP" },
  { code: "TPE", cityKo: "타이베이", cityEn: "Taipei Taoyuan", airportKo: "타오위안국제공항", countryKo: "대만", countryCode: "TW", popular: true },
  { code: "BKK", cityKo: "방콕", cityEn: "Bangkok Suvarnabhumi", airportKo: "수완나품공항", countryKo: "태국", countryCode: "TH", popular: true },
  { code: "CNX", cityKo: "치앙마이", cityEn: "Chiang Mai", airportKo: "치앙마이국제공항", countryKo: "태국", countryCode: "TH" },
  { code: "HAN", cityKo: "하노이", cityEn: "Hanoi", airportKo: "노이바이국제공항", countryKo: "베트남", countryCode: "VN" },
  { code: "SGN", cityKo: "호치민", cityEn: "Ho Chi Minh City", airportKo: "떤선녓국제공항", countryKo: "베트남", countryCode: "VN" },
  { code: "DAD", cityKo: "다낭", cityEn: "Da Nang", airportKo: "다낭국제공항", countryKo: "베트남", countryCode: "VN" },
  { code: "SIN", cityKo: "싱가포르", cityEn: "Singapore Changi", airportKo: "창이국제공항", countryKo: "싱가포르", countryCode: "SG", popular: true },
  { code: "HKG", cityKo: "홍콩", cityEn: "Hong Kong", airportKo: "홍콩국제공항", countryKo: "홍콩", countryCode: "HK" },
  { code: "MNL", cityKo: "마닐라", cityEn: "Manila", airportKo: "니노이 아키노 국제공항", countryKo: "필리핀", countryCode: "PH" },
  { code: "KUL", cityKo: "쿠알라룸푸르", cityEn: "Kuala Lumpur", airportKo: "쿠알라룸푸르국제공항", countryKo: "말레이시아", countryCode: "MY" },
  { code: "DPS", cityKo: "발리", cityEn: "Bali Denpasar", airportKo: "응우라라이국제공항", countryKo: "인도네시아", countryCode: "ID" },
  { code: "PAR", cityKo: "파리", cityEn: "Paris", airportKo: "파리 모든 공항", countryKo: "프랑스", countryCode: "FR" },
  { code: "CDG", cityKo: "파리", cityEn: "Paris Charles de Gaulle", airportKo: "샤를 드골 공항", countryKo: "프랑스", countryCode: "FR" },
  { code: "LON", cityKo: "런던", cityEn: "London", airportKo: "런던 모든 공항", countryKo: "영국", countryCode: "GB" },
  { code: "LHR", cityKo: "런던", cityEn: "London Heathrow", airportKo: "히스로공항", countryKo: "영국", countryCode: "GB" },
  { code: "ROM", cityKo: "로마", cityEn: "Rome", airportKo: "로마 모든 공항", countryKo: "이탈리아", countryCode: "IT" },
  { code: "FCO", cityKo: "로마", cityEn: "Rome Fiumicino", airportKo: "피우미치노공항", countryKo: "이탈리아", countryCode: "IT" },
  { code: "BCN", cityKo: "바르셀로나", cityEn: "Barcelona", airportKo: "바르셀로나 엘프라트 공항", countryKo: "스페인", countryCode: "ES" },
  { code: "NYC", cityKo: "뉴욕", cityEn: "New York", airportKo: "뉴욕 모든 공항", countryKo: "미국", countryCode: "US" },
  { code: "JFK", cityKo: "뉴욕", cityEn: "New York JFK", airportKo: "존 F. 케네디 국제공항", countryKo: "미국", countryCode: "US" },
  { code: "LAX", cityKo: "로스앤젤레스", cityEn: "Los Angeles", airportKo: "로스앤젤레스국제공항", countryKo: "미국", countryCode: "US" },
  { code: "SFO", cityKo: "샌프란시스코", cityEn: "San Francisco", airportKo: "샌프란시스코국제공항", countryKo: "미국", countryCode: "US" },
  { code: "SYD", cityKo: "시드니", cityEn: "Sydney", airportKo: "시드니공항", countryKo: "호주", countryCode: "AU" },
  { code: "MEL", cityKo: "멜버른", cityEn: "Melbourne", airportKo: "멜버른공항", countryKo: "호주", countryCode: "AU" },
  { code: "DXB", cityKo: "두바이", cityEn: "Dubai", airportKo: "두바이국제공항", countryKo: "아랍에미리트", countryCode: "AE" },
  { code: "IST", cityKo: "이스탄불", cityEn: "Istanbul", airportKo: "이스탄불공항", countryKo: "튀르키예", countryCode: "TR" },
];

const CITY_AIRPORT_CODES: Record<string, string> = {
  "서울": "SEL",
  "seoul": "SEL",
  "부산": "PUS",
  "busan": "PUS",
  "제주": "CJU",
  "jeju": "CJU",
  "도쿄": "TYO",
  "tokyo": "TYO",
  "오사카": "OSA",
  "osaka": "OSA",
  "교토": "OSA",
  "kyoto": "OSA",
  "후쿠오카": "FUK",
  "fukuoka": "FUK",
  "삿포로": "SPK",
  "sapporo": "SPK",
  "오키나와": "OKA",
  "okinawa": "OKA",
  "타이베이": "TPE",
  "taipei": "TPE",
  "방콕": "BKK",
  "bangkok": "BKK",
  "치앙마이": "CNX",
  "chiang mai": "CNX",
  "하노이": "HAN",
  "hanoi": "HAN",
  "호치민": "SGN",
  "ho chi minh": "SGN",
  "다낭": "DAD",
  "da nang": "DAD",
  "싱가포르": "SIN",
  "singapore": "SIN",
  "홍콩": "HKG",
  "hong kong": "HKG",
  "파리": "PAR",
  "paris": "PAR",
  "런던": "LON",
  "london": "LON",
  "로마": "ROM",
  "rome": "ROM",
  "바르셀로나": "BCN",
  "barcelona": "BCN",
  "뉴욕": "NYC",
  "new york": "NYC",
  "로스앤젤레스": "LAX",
  "los angeles": "LAX",
  "샌프란시스코": "SFO",
  "san francisco": "SFO",
  "시드니": "SYD",
  "sydney": "SYD",
  "멜버른": "MEL",
  "melbourne": "MEL",
  "두바이": "DXB",
  "dubai": "DXB",
  "이스탄불": "IST",
  "istanbul": "IST",
};

const COUNTRY_AIRPORT_CODES: Record<string, string> = {
  JP: "TYO",
  TW: "TPE",
  TH: "BKK",
  VN: "SGN",
  SG: "SIN",
  HK: "HKG",
  FR: "PAR",
  GB: "LON",
  IT: "ROM",
  ES: "BCN",
  US: "NYC",
  AU: "SYD",
  AE: "DXB",
  TR: "IST",
};

export function inferAirportCode(cityNames: Array<string | null | undefined>, countryCode?: string): string {
  for (const cityName of cityNames) {
    const normalized = cityName?.trim().toLowerCase();
    if (normalized && CITY_AIRPORT_CODES[normalized]) return CITY_AIRPORT_CODES[normalized];
  }
  return countryCode ? COUNTRY_AIRPORT_CODES[countryCode.toUpperCase()] ?? "" : "";
}

export function normalizeAirportCode(value: string): string {
  return value.replace(/[^a-z]/gi, "").slice(0, 3).toUpperCase();
}

export function findAirportByCode(code: string): AirportOption | undefined {
  const normalized = normalizeAirportCode(code);
  return AIRPORT_OPTIONS.find((airport) => airport.code === normalized);
}

export function formatAirportLabel(airport: AirportOption): string {
  return `${airport.cityKo} · ${airport.airportKo}`;
}

export function searchAirports(query: string, limit = 7): AirportOption[] {
  return searchAirportOptions(AIRPORT_OPTIONS, query, limit);
}

export function searchAirportOptions(catalog: AirportOption[], query: string, limit = 7): AirportOption[] {
  const normalized = normalizeSearchTerm(query);
  if (!normalized) return catalog.filter((airport) => airport.popular).slice(0, limit);
  const tokens = normalized.split(" ");
  return catalog
    .map((airport) => {
      const fields = [airport.code, airport.cityKo, airport.cityEn, airport.airportKo, airport.countryKo]
        .map(normalizeSearchTerm);
      const exactCode = airport.code.toLowerCase() === normalized;
      const exactCity = fields[1] === normalized || fields[2] === normalized;
      const startsWith = fields.some((value) => value.startsWith(normalized));
      const tokenMatch = tokens.every((token) => fields.some((value) => value.includes(token)));
      return { airport, score: exactCode ? 0 : exactCity ? 1 : startsWith ? 2 : tokenMatch ? 3 : 99 };
    })
    .filter(({ score }) => score < 99)
    .sort((a, b) => a.score - b.score || Number(Boolean(b.airport.popular)) - Number(Boolean(a.airport.popular)) || a.airport.cityKo.localeCompare(b.airport.cityKo, "ko"))
    .slice(0, limit)
    .map(({ airport }) => airport);
}

function normalizeSearchTerm(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .normalize("NFC")
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function buildSkyscannerFlightUrl({
  origin,
  destination,
  outboundDate,
  inboundDate,
}: {
  origin: string;
  destination: string;
  outboundDate: string;
  inboundDate: string;
}): string {
  const compactDate = (date: string) => date.replaceAll("-", "").slice(2);
  const route = [origin, destination, compactDate(outboundDate), compactDate(inboundDate)]
    .map((value) => encodeURIComponent(value.toLowerCase()))
    .join("/");
  return `https://www.skyscanner.co.kr/transport/flights/${route}/?adultsv2=1&cabinclass=economy&rtn=1&preferdirects=false`;
}
