/** Browser-restricted public key, inlined at build time. Absent means every map uses the built-in fallback. */
export const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() || null;

let loading: Promise<void> | undefined;
let authFailed = false;
const authFailureListeners = new Set<() => void>();

/**
 * Google reports a rejected key (wrong referrer, billing off, API disabled) through this
 * global callback after the script has already loaded, then paints its own error box.
 * Maps subscribe so they can switch to the fallback map instead.
 */
export function onGoogleMapsAuthFailure(listener: () => void): () => void {
  if (authFailed) {
    queueMicrotask(listener);
    return () => undefined;
  }
  authFailureListeners.add(listener);
  return () => {
    authFailureListeners.delete(listener);
  };
}

/** Browser-restricted public key only. The SDK is loaded after a user action. */
export function loadGoogleMaps(key: string): Promise<void> {
  if (authFailed) return Promise.reject(new Error("Google Maps key was rejected"));
  const callbacks = window as unknown as Record<string, unknown>;
  callbacks.gm_authFailure ??= () => {
    authFailed = true;
    authFailureListeners.forEach((listener) => listener());
    authFailureListeners.clear();
  };
  if (typeof google !== "undefined" && typeof google.maps?.importLibrary === "function") return Promise.resolve();
  if (loading) return loading;
  loading = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    const callback = "travelGlobeMapsReady";
    const timer = window.setTimeout(() => fail(), 15000);
    function fail() {
      window.clearTimeout(timer);
      script.remove();
      delete callbacks[callback];
      loading = undefined;
      reject(new Error("Google Maps could not load"));
    }
    callbacks[callback] = () => { window.clearTimeout(timer); delete callbacks[callback]; resolve(); };
    const params = new URLSearchParams({ key, v: "weekly", loading: "async", callback, language: "ko", auth_referrer_policy: "origin" });
    script.src = `https://maps.googleapis.com/maps/api/js?${params}`;
    script.async = true;
    script.referrerPolicy = "origin";
    script.onerror = fail;
    document.head.append(script);
  });
  return loading;
}
