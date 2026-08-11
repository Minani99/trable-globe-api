import { TravelImage } from "@/components/common/TravelImage";
import { formatDate } from "@/lib/utils/format";
import type { TravelPhoto } from "@/types";

interface PhotoGalleryProps {
  photos: TravelPhoto[];
  travelTitle: string;
}

export function PhotoGallery({ photos, travelTitle }: PhotoGalleryProps) {
  if (photos.length === 0) {
    return <p className="text-body">등록된 사진이 없습니다.</p>;
  }

  return (
    <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {photos.map((photo) => (
        <li key={photo.id}>
          <figure className="m-0">
            <div className="border-border-subtle aspect-[4/3] overflow-hidden rounded-[12px] border">
              <TravelImage
                src={photo.imageUrl}
                alt={photo.caption ?? `${travelTitle} 사진`}
                fallbackLabel={travelTitle.slice(0, 2)}
                className="h-full w-full object-cover"
              />
            </div>
            {photo.caption ? (
              <figcaption className="text-content-muted mt-2.5 flex items-baseline justify-between gap-3 text-[0.8rem]">
                <span>{photo.caption}</span>
                {photo.takenAt ? (
                  <time dateTime={photo.takenAt} className="text-content-faint shrink-0 font-mono text-[0.7rem]">
                    {formatDate(photo.takenAt)}
                  </time>
                ) : null}
              </figcaption>
            ) : null}
          </figure>
        </li>
      ))}
    </ul>
  );
}
