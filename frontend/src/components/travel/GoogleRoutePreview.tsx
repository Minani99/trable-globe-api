"use client";

import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps } from "@/lib/google-maps-loader";
import { isDirectionsStopLocated, type GoogleDirectionsStop, type GoogleTravelMode } from "@/lib/google-directions";

const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();

export function GoogleRoutePreview({ stops, mode }: { stops: GoogleDirectionsStop[]; mode: GoogleTravelMode }) {
  const [open, setOpen] = useState(false);
  if (!apiKey || stops.length < 2) return null;
  const supported = stops.length <= 27 && stops.every(isDirectionsStopLocated) && (mode !== "transit" || stops.length === 2);
  if (!supported) return <p>앱 내 지도는 위치가 지정된 2~27곳을 지원해요. 대중교통의 여러 구간은 아래 Google Maps 링크에서 확인해 주세요.</p>;
  return <div className="google-route-preview">
    <button type="button" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? "경로 지도 접기" : "앱에서 경로·이동시간 보기"}</button>
    {open ? <RouteCanvas key={JSON.stringify([stops, mode])} stops={stops} mode={mode} /> : null}
  </div>;
}

function duration(value?: number | null) {
  if (value == null || !Number.isFinite(value)) return "시간 정보 없음";
  const minutes = Math.max(1, Math.ceil(value / 60000));
  return minutes >= 60 ? `${Math.floor(minutes / 60)}시간 ${minutes % 60}분` : `${minutes}분`;
}

function RouteCanvas({ stops, mode }: { stops: GoogleDirectionsStop[]; mode: GoogleTravelMode }) {
  const element = useRef<HTMLDivElement>(null);
  const [result, setResult] = useState<google.maps.routes.Route | null>(null);
  const [error, setError] = useState(false);
  const signature = JSON.stringify(stops);
  useEffect(() => {
    const stops: GoogleDirectionsStop[] = JSON.parse(signature);
    let cancelled = false;
    const polylines: google.maps.Polyline[] = [];
    const markers: google.maps.Marker[] = [];
    const timer = window.setTimeout(() => { cancelled = true; setError(true); }, 25000);
    async function show() {
      await loadGoogleMaps(apiKey!);
      const [{ Map }, { Route }, { Marker }] = await Promise.all([
        google.maps.importLibrary("maps") as Promise<google.maps.MapsLibrary>,
        google.maps.importLibrary("routes") as Promise<google.maps.RoutesLibrary>,
        google.maps.importLibrary("marker") as Promise<google.maps.MarkerLibrary>,
      ]);
      if (cancelled || !element.current) return;
      const point = (stop: GoogleDirectionsStop) => ({ lat: stop.latitude!, lng: stop.longitude! });
      const { routes } = await Route.computeRoutes({
        origin: point(stops[0]), destination: point(stops[stops.length - 1]),
        intermediates: stops.slice(1, -1).map((stop) => ({ location: point(stop) })),
        travelMode: mode === "walking" ? "WALKING" : mode === "driving" ? "DRIVING" : "TRANSIT",
        fields: ["path", "legs", "durationMillis", "distanceMeters", "warnings"],
      });
      if (cancelled || !element.current) return;
      const route = routes?.[0];
      if (!route?.path?.length || route.legs?.length !== stops.length - 1) throw new Error("No complete route");
      const map = new Map(element.current, { center: point(stops[0]), zoom: 12, mapTypeControl: false, streetViewControl: false, gestureHandling: "cooperative" });
      polylines.push(...route.createPolylines());
      polylines.forEach((line) => line.setMap(map));
      const bounds = new google.maps.LatLngBounds();
      route.path.forEach((p) => bounds.extend(p));
      map.fitBounds(bounds, 32);
      stops.forEach((stop, index) => markers.push(new Marker({ map, position: point(stop), label: String(index + 1), title: stop.placeName })));
      window.clearTimeout(timer);
      setResult(route);
    }
    show().catch(() => { if (!cancelled) { window.clearTimeout(timer); setError(true); } });
    return () => { cancelled = true; window.clearTimeout(timer); polylines.forEach((line) => line.setMap(null)); markers.forEach((marker) => marker.setMap(null)); };
  }, [signature, mode]);
  return <div>
    {!result && !error ? <p role="status">Google에서 경로를 찾고 있어요…</p> : null}
    {error ? <p role="alert">이 경로를 불러오지 못했어요. 아래 Google Maps에서 확인하거나 지도를 접었다 다시 열어 주세요.</p> : null}
    <div ref={element} className="google-route-canvas" aria-label="Google 실제 이동 경로 지도" hidden={error} />
    {result ? <>
      <p><strong>이동 약 {duration(result.durationMillis)}</strong>{result.distanceMeters !== undefined ? ` · ${(result.distanceMeters / 1000).toFixed(1)}km` : ""}</p>
      <p>조회 시점의 예상 이동시간이며, 장소 체류·예약 시간은 포함하지 않습니다.</p>
      <ol>{result.legs?.map((leg, index) => <li key={index}><span>{index + 1}. {stops[index].placeName} → {stops[index + 1].placeName}</span><strong>{duration(leg.durationMillis)}</strong></li>)}</ol>
      {result.warnings?.map((warning, index) => <p key={index}>{warning}</p>)}
    </> : null}
  </div>;
}
