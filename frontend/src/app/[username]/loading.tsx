/**
 * Shown while the profile bundle is in flight. Mirrors the real layout - a tall globe
 * stage with a panel beside it - so the page does not jump when data lands.
 */
export default function ProfileLoading() {
  return (
    <div className="flex-1" aria-busy="true" aria-live="polite">
      <span className="sr-only">여행 기록을 불러오는 중입니다.</span>

      <section className="relative w-full lg:h-[calc(100vh-3.5rem)] lg:max-h-[820px] lg:min-h-[580px]">
        <div className="flex h-[52vh] max-h-[560px] min-h-[340px] items-center justify-center lg:absolute lg:inset-0 lg:h-full lg:max-h-none">
          <div className="aspect-square h-[52%] max-h-[420px] min-h-[180px] animate-pulse rounded-full bg-[radial-gradient(circle_at_35%_30%,rgba(47,109,158,0.2),rgba(10,21,34,0.55)_58%,transparent_72%)]" />
        </div>

        <div className="flex flex-col gap-4 px-5 py-5 sm:px-8 lg:absolute lg:inset-0 lg:items-end lg:p-6">
          <div className="panel h-[210px] w-full animate-pulse lg:w-[280px]" />
        </div>
      </section>

      <div className="mx-auto w-full max-w-[1400px] px-5 pt-12 sm:px-8">
        <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((index) => (
            <div key={index} className="flex flex-col gap-4">
              <div className="bg-surface aspect-[4/3] w-full animate-pulse rounded-[14px]" />
              <div className="bg-surface h-4 w-2/3 animate-pulse rounded" />
              <div className="bg-surface h-3 w-1/3 animate-pulse rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
