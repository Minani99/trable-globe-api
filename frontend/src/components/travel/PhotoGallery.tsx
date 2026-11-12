import Link from "next/link";

import { TravelImage } from "@/components/common/TravelImage";
import { formatDate } from "@/lib/utils/format";
import type { TravelPhoto } from "@/types";

interface PhotoGalleryProps {
  photos: TravelPhoto[];
  travelTitle: string;
  /** Only the owner can add photos; visitors never see the empty state. */
  addPhotosHref?: string;
}

export function PhotoGallery({ photos, travelTitle, addPhotosHref }: PhotoGalleryProps) {
  if (photos.length === 0) {
    return (
      <div className="travel-photo-empty">
        <span aria-hidden="true"><i /><i /><i /></span>
        <div>
          <strong>아직 사진이 없습니다</strong>
          <p>경로와 장소 기록은 그대로 공개됩니다. 사진을 추가하면 방문자도 이곳에서 볼 수 있어요.</p>
          {addPhotosHref ? <Link className="travel-photo-empty__action" href={addPhotosHref}>사진 추가하기</Link> : null}
        </div>
      </div>
    );
  }

  return (
    <ul className={`travel-gallery travel-gallery--${Math.min(photos.length, 4)}`}>
      {photos.map((photo, index) => (
        <li key={photo.id} className={index === 0 ? "is-featured" : ""}>
          <figure>
            <div className="travel-gallery__media">
              <TravelImage
                src={photo.imageUrl}
                alt={photo.caption ?? `${travelTitle} 사진 ${index + 1}`}
                fallbackLabel={travelTitle.slice(0, 2)}
                className="h-full w-full object-cover"
              />
              <span className="travel-gallery__index">
                {String(index + 1).padStart(2, "0")}
              </span>
            </div>
            <figcaption>
              <span>{photo.caption ?? "기록해 둔 장면"}</span>
              {photo.takenAt ? <time dateTime={photo.takenAt}>{formatDate(photo.takenAt)}</time> : null}
            </figcaption>
          </figure>
        </li>
      ))}
    </ul>
  );
}
