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
