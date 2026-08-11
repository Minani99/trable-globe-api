import { formatDate } from "@/lib/utils/format";
import type { TravelPlace } from "@/types";

interface TravelPlaceListProps {
  places: TravelPlace[];
}

export function TravelPlaceList({ places }: TravelPlaceListProps) {
  if (places.length === 0) {
    return <p className="text-body">기록된 방문 장소가 없습니다.</p>;
  }

  return (
    <ol className="border-border-subtle flex flex-col border-t">
      {places.map((place, index) => (
        <li
          key={place.id}
          className="border-border-subtle grid grid-cols-[2rem_1fr] gap-x-4 border-b py-5 sm:grid-cols-[2rem_1fr_auto]"
        >
          <span className="text-content-faint pt-0.5 font-mono text-[0.8rem]">
            {String(index + 1).padStart(2, "0")}
          </span>

          <div>
            <h3 className="text-content text-[0.98rem] font-medium">{place.placeName}</h3>
            <p className="text-content-faint mt-1 text-[0.76rem]">
              {[place.city?.nameKo, place.country.nameKo].filter(Boolean).join(" · ")}
            </p>
            {place.memo ? <p className="text-body mt-2.5 text-[0.86rem]">{place.memo}</p> : null}
          </div>

          {place.visitedAt ? (
            <time
              dateTime={place.visitedAt}
              className="text-content-faint col-start-2 mt-2 font-mono text-[0.74rem] sm:col-start-3 sm:mt-0 sm:pt-0.5"
            >
              {formatDate(place.visitedAt)}
            </time>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
