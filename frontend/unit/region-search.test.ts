import { expect, test } from "@playwright/test";
import { NextRequest } from "next/server";
import { GET } from "../src/app/api/locations/search/route";
import { GET as recommend } from "../src/app/api/places/recommend/route";

test("강릉 주변 추천에 공급자가 수원 장소를 섞어도 거리로 제외한다", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify([
    { place_id: 1, osm_id: 1, osm_type: "node", name: "강릉 식당", display_name: "강릉시", category: "amenity", type: "restaurant", lat: "37.754", lon: "128.878" },
    { place_id: 2, osm_id: 2, osm_type: "node", name: "수원 식당", display_name: "수원시", category: "amenity", type: "restaurant", lat: "37.2909", lon: "127.0166" },
  ]));
  try {
    const response = await recommend(new NextRequest("http://localhost/api/places/recommend?category=food&lat=37.7525313&lng=128.8759523"));
    expect((await response.json()).data.map((place: { name: string }) => place.name)).toEqual(["강릉 식당"]);
  } finally { globalThis.fetch = original; }
});

test("강릉 지역 검색은 수도권 근접 검색을 없애고 수원 음식점을 제외한다", async () => {
  const original = globalThis.fetch;
  let requested: URL | undefined;
  globalThis.fetch = async input => {
    requested = new URL(String(input));
    return new Response(JSON.stringify([
      { place_id: 1, name: "강릉 동치미 막국수", display_name: "수원시", addresstype: "restaurant", type: "restaurant", lat: "37.2909", lon: "127.0166", address: { city: "수원시" } },
      { place_id: 2, name: "강릉시", display_name: "강릉시, 강원특별자치도", addresstype: "city", type: "administrative", lat: "37.7525313", lon: "128.8759523", address: { city: "강릉시" } },
    ]));
  };
  try {
    const response = await GET(new NextRequest("http://localhost/api/locations/search?q=강릉&country=kr&purpose=region&lat=37&lng=127.5"));
    expect(requested!.searchParams.get("q")).toBe("강릉시");
    expect(requested!.searchParams.get("featureType")).toBe("settlement");
    expect(requested!.searchParams.has("viewbox")).toBe(false);
    expect((await response.json()).data).toEqual([expect.objectContaining({ name: "강릉시", city: "강릉시", latitude: 37.7525313, longitude: 128.8759523 })]);
  } finally { globalThis.fetch = original; }
});

test("도시 검색에서 음식점만 반환되면 다른 도시를 대체 목적지로 사용하지 않는다", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify([{ place_id: 1, name: "강릉 동치미 막국수", display_name: "수원시", addresstype: "restaurant", lat: "37.29", lon: "127.01" }]));
  try {
    const response = await GET(new NextRequest("http://localhost/api/locations/search?q=강릉&country=kr&purpose=region"));
    expect((await response.json()).data).toEqual([]);
  } finally { globalThis.fetch = original; }
});

test("일반 장소 검색에서는 음식점과 근접 검색을 유지한다", async () => {
  const original = globalThis.fetch;
  let requested: URL | undefined;
  globalThis.fetch = async input => {
    requested = new URL(String(input));
    return new Response(JSON.stringify([{ place_id: 1, name: "강릉 동치미 막국수", display_name: "수원시", addresstype: "restaurant", lat: "37.29", lon: "127.01" }]));
  };
  try {
    const response = await GET(new NextRequest("http://localhost/api/locations/search?q=강릉&country=kr&lat=37&lng=127.5"));
    expect(requested!.searchParams.get("q")).toBe("강릉");
    expect(requested!.searchParams.has("viewbox")).toBe(true);
    expect((await response.json()).data).toHaveLength(1);
  } finally { globalThis.fetch = original; }
});
