"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Icon } from "@/components/common/Icon";
import { googleMapsApiKey, loadGoogleMaps } from "@/lib/google-maps-loader";
import { isDirectionsStopLocated, type GoogleDirectionsStop, type GoogleTravelMode } from "@/lib/google-directions";

const apiKey = googleMapsApiKey;

type PreviewProps = { stops: GoogleDirectionsStop[]; mode: GoogleTravelMode; onRoute?: (route: google.maps.routes.Route | null) => void };

export function GoogleRoutePreview({ stops, mode, onRoute }: PreviewProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  if (!apiKey || stops.length < 2) return null;
  const supported = stops.length <= 27 && stops.every(isDirectionsStopLocated) && (mode !== "transit" || stops.length === 2);
  if (!supported) return <p>앱 내 지도는 위치가 지정된 2~27곳을 지원해요. 대중교통의 여러 구간은 아래 Google Maps 링크에서 확인해 주세요.</p>;
  return <div className="google-route-preview">
    <button className="google-route-preview__toggle" type="button" aria-expanded={open} aria-controls={panelId} onClick={() => { onRoute?.(null); setOpen(!open); }}><Icon name="pin" /><span>{open ? "경로 지도 접기" : "앱에서 경로·이동시간 보기"}</span><Icon name={open ? "chevron-up" : "chevron-down"} /></button>
    <div id={panelId} hidden={!open}>{open ? <RouteCanvas key={JSON.stringify([stops, mode])} stops={stops} mode={mode} onRoute={onRoute} /> : null}</div>
  </div>;
}

function duration(value?: number | null) {
  if (value == null || !Number.isFinite(value)) return "시간 정보 없음";
  const minutes = Math.max(1, Math.ceil(value / 60000));
  return minutes >= 60 ? `${Math.floor(minutes / 60)}시간 ${minutes % 60}분` : `${minutes}분`;
}

function RouteCanvas({ stops, mode, onRoute }: PreviewProps) {
  const element = useRef<HTMLDivElement>(null);
  const [result, setResult] = useState<google.maps.routes.Route | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
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
      if (cancelled || (!onRoute && !element.current)) return;
      const point = (stop: GoogleDirectionsStop) => ({ lat: stop.latitude!, lng: stop.longitude! });
      const { routes } = await Route.computeRoutes({
        origin: point(stops[0]), destination: point(stops[stops.length - 1]),
        intermediates: stops.slice(1, -1).map((stop) => ({ location: point(stop) })),
        travelMode: mode === "walking" ? "WALKING" : mode === "driving" ? "DRIVING" : "TRANSIT",
        fields: ["path", "legs", "durationMillis", "distanceMeters", "warnings"],
      });
      if (cancelled || (!onRoute && !element.current)) return;
      const route = routes?.[0];
      if (!route?.path?.length || route.legs?.length !== stops.length - 1) throw new Error("No complete route");
      if (!onRoute) {
        const map = new Map(element.current!, { center: point(stops[0]), zoom: 12, mapTypeControl: false, streetViewControl: false, gestureHandling: "cooperative" });
        polylines.push(...route.createPolylines());
        polylines.forEach((line) => line.setMap(map));
        const bounds = new google.maps.LatLngBounds();
        route.path.forEach((p) => bounds.extend(p));
        map.fitBounds(bounds, 32);
        stops.forEach((stop, index) => markers.push(new Marker({ map, position: point(stop), label: String(index + 1), title: stop.placeName })));
      }
      window.clearTimeout(timer);
      onRoute?.(route);
      setResult(route);
    }
    show().catch(() => { if (!cancelled) { window.clearTimeout(timer); setError(true); } });
    return () => { cancelled = true; window.clearTimeout(timer); polylines.forEach((line) => line.setMap(null)); markers.forEach((marker) => marker.setMap(null)); };
  }, [signature, mode, attempt, onRoute]);
  return <div className="google-route-preview__result" aria-busy={!result && !error}>
    {!result && !error ? <p className="google-route-preview__status" role="status">Google에서 경로를 찾고 있어요…</p> : null}
    {error ? <div className="google-route-preview__error"><p role="alert">이 경로를 불러오지 못했어요. 아래 Google Maps에서도 확인할 수 있습니다.</p><button type="button" onClick={() => { setError(false); setResult(null); setAttempt(value => value + 1); }}><Icon name="refresh" /> 다시 시도</button></div> : null}
    {!onRoute ? <div ref={element} className="google-route-canvas" aria-label="Google 실제 이동 경로 지도" hidden={error} /> : null}
    {result ? <>
      <p className="google-route-preview__total"><strong>이동 약 {duration(result.durationMillis)}</strong>{result.distanceMeters !== undefined ? <span>{(result.distanceMeters / 1000).toFixed(1)}km</span> : null}</p>
      <p className="google-route-preview__caption">예상 이동시간 · 장소 체류시간 제외</p>
      <ol>{result.legs?.map((leg, index) => <li key={index}><span>{index + 1}. {stops[index].placeName} → {stops[index + 1].placeName}</span><strong>{duration(leg.durationMillis)}</strong></li>)}</ol>
      {result.warnings?.map((warning, index) => <p key={index}>{warning}</p>)}
    </> : null}
  </div>;
}
