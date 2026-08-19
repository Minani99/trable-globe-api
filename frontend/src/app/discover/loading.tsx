export default function DiscoverLoading() {
  return (
    <main className="discover-page flex-1" aria-busy="true">
      <div className="site-shell discover-shell">
        <div className="discover-loading discover-loading--hero" />
        <div className="discover-loading discover-loading--search" />
        <div className="member-grid">
          {Array.from({ length: 4 }, (_, index) => <div key={index} className="discover-loading discover-loading--card" />)}
        </div>
      </div>
    </main>
  );
}
