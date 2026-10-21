export type LocatedStop = { key: string; latitude: number; longitude: number };

export function routeDistance(stops: LocatedStop[]): number {
  return stops.slice(1).reduce((sum, stop, index) => sum + distance(stops[index], stop), 0);
}

function distance(a: LocatedStop, b: LocatedStop): number {
  const radians = Math.PI / 180;
  const lat = (b.latitude - a.latitude) * radians;
  const lng = (b.longitude - a.longitude) * radians;
  const h = Math.sin(lat / 2) ** 2 + Math.cos(a.latitude * radians) * Math.cos(b.latitude * radians) * Math.sin(lng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
}

/** A bounded 2-opt suggestion. Endpoints stay fixed; no claim of road-time optimality. */
export function suggestVisitOrder(stops: LocatedStop[]) {
  const beforeKm = routeDistance(stops);
  let ordered = [...stops];
  let afterKm = beforeKm;
  if (stops.length < 4 || stops.length > 30) return { ordered, beforeKm, afterKm };
  for (let pass = 0; pass < 30; pass += 1) {
    let improved = false;
    for (let first = 1; first < ordered.length - 2; first += 1) {
      for (let last = first + 1; last < ordered.length - 1; last += 1) {
        const candidate = [...ordered.slice(0, first), ...ordered.slice(first, last + 1).reverse(), ...ordered.slice(last + 1)];
        const km = routeDistance(candidate);
        if (km + 0.001 < afterKm) { ordered = candidate; afterKm = km; improved = true; }
      }
    }
    if (!improved) break;
  }
  return { ordered, beforeKm, afterKm };
}
