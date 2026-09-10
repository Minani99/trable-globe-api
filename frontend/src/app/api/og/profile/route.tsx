import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

import { fetchProfile, fetchTravels } from "@/lib/api/profile";
import { siteConfig } from "@/lib/config";
import { buildTravelRecap, travelsForYear } from "@/lib/travelInsights";
import { publicDisplayName } from "@/lib/utils/profile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const size = { width: 1200, height: 630 };
const usernamePattern = /^[A-Za-z0-9][A-Za-z0-9._-]{2,29}$/;
const numberFormatter = new Intl.NumberFormat("ko-KR");

export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get("username")?.trim() ?? "";
  const requestedYear = parseYear(request.nextUrl.searchParams.get("year"));

  if (!usernamePattern.test(username)) {
    return new Response("Invalid profile", { status: 400 });
  }

  try {
    const [profile, travels] = await Promise.all([fetchProfile(username), fetchTravels(username)]);
    const year = requestedYear !== null && travels.some((travel) => (
      travel.startDate.startsWith(`${requestedYear}-`)
    )) ? requestedYear : null;
    const recap = buildTravelRecap(travelsForYear(travels, year), year);
    const cardName = truncate(publicDisplayName(profile.displayName), 18);
    const scope = year ? `${year}년 여행 세계` : "나의 여행 세계";
    const topCountries = [...new Set(
      travelsForYear(travels, year).flatMap((travel) => travel.countries.map((country) => country.nameKo)),
    )].slice(0, 4);

    return new ImageResponse(
      (
        <div
          lang="ko-KR"
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            position: "relative",
            overflow: "hidden",
            color: "#142b34",
            background: "linear-gradient(135deg, #fbfcf9 0%, #f6f7f4 58%, #eaf2f0 100%)",
            fontFamily: "sans-serif",
          }}
        >
          <div style={{ position: "absolute", width: 560, height: 560, right: -80, top: -30, border: "2px solid rgba(57, 119, 140, 0.28)", borderRadius: 999, background: "#8fd0e5", boxShadow: "0 30px 70px rgba(23, 51, 61, 0.14)", display: "flex" }} />
          <div style={{ position: "absolute", width: 430, height: 430, right: -15, top: 35, border: "2px solid rgba(221, 243, 248, 0.72)", borderRadius: 999, display: "flex" }} />
          <div style={{ position: "absolute", width: 300, height: 300, right: 50, top: 100, border: "1px solid rgba(221, 243, 248, 0.64)", borderRadius: 999, display: "flex" }} />
          <div style={{ position: "absolute", width: 390, height: 180, right: 20, top: 190, borderTop: "5px solid #e85f2b", borderRadius: "50%", transform: "rotate(-8deg)", display: "flex" }} />
          {[{ right: 365, top: 235 }, { right: 205, top: 310 }, { right: 42, top: 210 }].map((point, index) => (
            <div key={index} style={{ position: "absolute", width: 22, height: 22, right: point.right, top: point.top, border: "5px solid #e85f2b", borderRadius: 999, background: "#fffaf6", boxShadow: "0 0 24px rgba(232,95,43,0.36)", display: "flex" }} />
          ))}

          <div style={{ width: 780, height: "100%", display: "flex", flexDirection: "column", padding: "62px 0 52px 70px" }}>
            <div style={{ display: "flex", alignItems: "center", color: "#17303a", fontSize: 19, fontWeight: 700, letterSpacing: "0.22em" }}>
              <span style={{ width: 18, height: 18, marginRight: 18, display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #e85f2b", borderRadius: 999 }}>
                <span style={{ width: 5, height: 5, display: "flex", background: "#e85f2b", borderRadius: 999 }} />
              </span>
              {siteConfig.wordmark}
            </div>
            <div style={{ display: "flex", marginTop: 62, color: "#71848a", fontSize: 21 }}>
              @{profile.username} · {scope}
            </div>
            <div style={{ display: "flex", maxWidth: 700, marginTop: 12, fontSize: 58, fontWeight: 700, lineHeight: 1.16, letterSpacing: "-0.04em" }}>
              {cardName}님이<br />지구본에 쌓은 여행
            </div>
            <div style={{ display: "flex", marginTop: 28, color: "#657a81", fontSize: 20 }}>
              {topCountries.length > 0 ? topCountries.join(" · ") : "첫 여행을 기다리는 지구본"}
            </div>

            <div style={{ display: "flex", marginTop: "auto", gap: 10 }}>
              <Stat value={`${recap.travelCount}`} label="여행" />
              <Stat value={`${recap.countryCount}`} label="나라" />
              <Stat value={`${numberFormatter.format(recap.travelDays)}`} label="여행한 날" />
              <Stat value={`${numberFormatter.format(recap.distanceKm)} km`} label="이어진 거리" wide />
            </div>
          </div>

          <div style={{ position: "absolute", right: 62, bottom: 46, display: "flex", color: "#5d747b", fontSize: 17 }}>
            여행 계획과 기록을 한곳에서
          </div>
        </div>
      ),
      {
        ...size,
        headers: {
          "Cache-Control": "public, max-age=300, s-maxage=900, stale-while-revalidate=86400",
        },
      },
    );
  } catch {
    return new ImageResponse(
      (
        <div lang="ko-KR" style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 72, color: "#142b34", background: "linear-gradient(135deg, #fbfcf9, #eaf2f0)", fontFamily: "sans-serif" }}>
          <div style={{ display: "flex", color: "#d95527", fontSize: 20, fontWeight: 700, letterSpacing: "0.2em" }}>{siteConfig.wordmark}</div>
          <div style={{ display: "flex", marginTop: 52, fontSize: 64, fontWeight: 700 }}>여행 세계를 펼치는 중</div>
          <div style={{ display: "flex", marginTop: 22, color: "#6d8087", fontSize: 24 }}>잠시 후 지구본에 쌓인 기록을 만나보세요.</div>
        </div>
      ),
      { ...size, headers: { "Cache-Control": "no-store" } },
    );
  }
}

function Stat({ value, label, wide = false }: { value: string; label: string; wide?: boolean }) {
  return (
    <div style={{ minWidth: wide ? 180 : 112, display: "flex", flexDirection: "column", padding: "14px 18px", border: "1px solid #cedbda", borderRadius: 14, background: "rgba(255,255,255,0.74)" }}>
      <span style={{ display: "flex", fontSize: wide ? 25 : 30, fontWeight: 650 }}>{value}</span>
      <span style={{ display: "flex", marginTop: 3, color: "#71848a", fontSize: 13 }}>{label}</span>
    </div>
  );
}

function parseYear(value: string | null): number | null {
  if (!value || !/^\d{4}$/.test(value)) return null;
  const year = Number(value);
  return year >= 1900 && year <= 2100 ? year : null;
}

function truncate(value: string, maxLength: number): string {
  const characters = Array.from(value.trim());
  return characters.length > maxLength
    ? `${characters.slice(0, maxLength).join("")}…`
    : characters.join("");
}
