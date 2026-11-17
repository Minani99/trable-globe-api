import Link from "next/link";

/**
 * Shown to signed-out visitors at the end of a shared profile or trip.
 *
 * Shared pages are how most people first meet the product. Ending them with a clear way
 * to make your own globe turns a visit into a sign-up instead of a dead end. Server-only
 * markup; the caller decides visibility from the server-side session.
 */
export function GuestSignupBand({ title, copy, next = "/studio" }: {
  title: string;
  copy: string;
  /** Where sign-up returns to. */
  next?: string;
}) {
  return (
    <section className="landing-closing guest-signup-band" aria-labelledby="guest-signup-title">
      <div className="site-shell landing-closing__inner">
        <div>
          <p className="landing-closing__eyebrow">나도 만들어 보기</p>
          <h2 id="guest-signup-title">{title}</h2>
          <p className="landing-closing__copy">{copy}</p>
        </div>
        <div className="landing-closing__actions">
          <Link href={`/register?next=${encodeURIComponent(next)}`} className="landing-closing__primary">내 지구본 만들기</Link>
          <Link href={`/login?next=${encodeURIComponent(next)}`} className="landing-closing__secondary">이미 계정이 있어요</Link>
        </div>
      </div>
    </section>
  );
}
