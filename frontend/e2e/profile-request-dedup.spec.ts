import { expect, test } from "@playwright/test";
import { fetchProfile, fetchTravels, fetchVisitedCountries } from "../src/lib/api/profile";

test("같은 프로필의 동시 요청만 공유하고 계정·경로·완료된 요청은 분리한다", async () => {
  const original = globalThis.fetch;
  const releases: Array<() => void> = [];
  let count = 0;
  globalThis.fetch = async () => {
    count += 1;
    await new Promise<void>(resolve => releases.push(resolve));
    return Response.json({ success: true, data: [] });
  };
  try {
    const first = fetchProfile("request_a");
    const duplicate = fetchProfile("request_a");
    const other = fetchProfile("request_b");
    const countries = fetchVisitedCountries("request_a");
    const travels = fetchTravels("request_a");
    expect(first).toBe(duplicate);
    expect(count).toBe(4);
    releases.splice(0).forEach(release => release());
    await Promise.all([first, duplicate, other, countries, travels]);
    const fresh = fetchProfile("request_a");
    expect(count).toBe(5);
    releases.splice(0).forEach(release => release());
    await fresh;
  } finally {
    releases.forEach(release => release());
    globalThis.fetch = original;
  }
});

test("실패한 프로필 요청은 다음 시도를 막지 않는다", async () => {
  const original = globalThis.fetch;
  let count = 0;
  globalThis.fetch = async () => {
    count += 1;
    return Response.json({ success: count > 1, data: count > 1 ? [] : null }, { status: count > 1 ? 200 : 503 });
  };
  try {
    const first = fetchTravels("retry_user");
    const duplicate = fetchTravels("retry_user");
    const results = await Promise.allSettled([first, duplicate]);
    expect(results.map(result => result.status)).toEqual(["rejected", "rejected"]);
    expect(count).toBe(1);
    expect(await fetchTravels("retry_user")).toEqual([]);
    expect(count).toBe(2);
  } finally { globalThis.fetch = original; }
});
