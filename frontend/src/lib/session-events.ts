export const SESSION_EXPIRED_EVENT = "travel-globe:session-expired";

export function notifySessionExpired() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
}
