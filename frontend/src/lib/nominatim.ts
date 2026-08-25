import "server-only";

let requestSlot = Promise.resolve();
let lastRequestAt = 0;

/** Keep fallback geocoding within Nominatim's public one-request-per-second policy. */
export async function waitForNominatimSlot() {
  const task = requestSlot.then(async () => {
    const wait = Math.max(0, 1_050 - (Date.now() - lastRequestAt));
    if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
    lastRequestAt = Date.now();
  });
  requestSlot = task.catch(() => undefined);
  await task;
}
