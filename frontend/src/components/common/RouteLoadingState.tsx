export function RouteLoadingState({ label = "여행 정보를 준비하고 있어요" }: { label?: string }) {
  return (
    <main id="main" className="route-state-page" aria-busy="true" aria-live="polite">
      <span className="route-state-page__brand" aria-hidden="true">TRAVEL GLOBE</span>
      <section className="route-loading-card">
        <span className="route-loading-card__signal" aria-hidden="true" />
        <p>{label}</p>
        <div aria-hidden="true"><i /><i /><i /></div>
      </section>
    </main>
  );
}
