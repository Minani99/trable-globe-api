/* eslint-disable @next/next/no-html-link-for-pages -- Hard navigations keep cached offline documents usable without an RSC request. */

export default function OfflinePage() {
  return (
    <main id="main" className="offline-page">
      <section className="offline-card" aria-labelledby="offline-heading">
        <span className="offline-card__mark" aria-hidden="true">◎</span>
        <p className="eyebrow">Offline</p>
        <h1 id="offline-heading">인터넷 연결을 확인해 주세요</h1>
        <p>미리 열어 둔 오늘 일정은 연결 없이도 확인할 수 있습니다. 완료와 메모는 기기에 저장했다가 연결되면 자동으로 반영합니다.</p>
        <div>
          <a href="/" className="offline-card__reload">다시 연결</a>
          <a href="/offline/trip">저장된 일정</a>
        </div>
      </section>
    </main>
  );
}
