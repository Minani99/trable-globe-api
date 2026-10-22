import { test as base, type BrowserContext } from "@playwright/test";

export * from "@playwright/test";

/**
 * CI builds with a placeholder Google key so the Google code paths are compiled in. A real
 * SDK request with that key would load and then be rejected at an unpredictable moment, so
 * every context blocks it and pages take the built-in map. Tests that cover Google install a
 * mock `google.maps` with `addInitScript`, which the loader uses without any request.
 */
export async function blockGoogleMaps(context: BrowserContext) {
  await context.route("https://maps.googleapis.com/**", (route) => route.abort());
}

export const test = base.extend<{ googleMapsBlocked: void }>({
  googleMapsBlocked: [async ({ context }, use) => {
    await blockGoogleMaps(context);
    await use();
  }, { auto: true }],
});
