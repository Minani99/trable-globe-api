import { JournalPhoto } from "@/components/common/JournalPhoto";

export function AuthScene() {
  return <aside className="auth-scene" aria-label="여행의 한 장면">
    <JournalPhoto priority />
    <div className="auth-scene__copy"><span>KYOTO, JAPAN</span><p>다녀온 순간도,{" "}<br />떠나고 싶은 마음도.</p><small>나만의 여행 노트에 차곡차곡.</small></div>
    <a className="auth-scene__credit" href="https://unsplash.com/photos/a-narrow-street-with-a-pagoda-in-the-background-yQvYgnh9XEg" target="_blank" rel="noreferrer">Photo · Filipe Freitas</a>
  </aside>;
}
