import { JournalPhoto } from "@/components/common/JournalPhoto";
import { journalPhotos } from "@/lib/journal-photos";

export function AuthScene({ registration = false }: { registration?: boolean }) {
  const photo = registration ? journalPhotos[2] : journalPhotos[0];
  return <aside className="auth-scene" aria-label="여행의 한 장면">
    <JournalPhoto photo={photo} priority />
    <div className="auth-scene__copy"><span>{photo.region}</span><p>{photo.title}</p></div>
    <a className="auth-scene__credit" href={photo.source} target="_blank" rel="noreferrer">사진 · {photo.author}</a>
  </aside>;
}
