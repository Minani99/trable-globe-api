let loading: Promise<void> | undefined;

/** Browser-restricted public key only. The SDK is loaded after a user action. */
export function loadGoogleMaps(key: string): Promise<void> {
  if (typeof google !== "undefined" && typeof google.maps?.importLibrary === "function") return Promise.resolve();
  if (loading) return loading;
  loading = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    const callback = "travelGlobeMapsReady";
    const callbacks = window as unknown as Record<string, unknown>;
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
