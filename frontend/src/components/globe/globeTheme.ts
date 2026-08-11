/**
 * Colours for the WebGL scene.
 *
 * WebGL materials cannot read CSS custom properties, so these mirror the tokens in
 * globals.css by hand. Change one, change the other - they are meant to look like the
 * same surface.
 */
export const globeTheme = {
  ocean: "#0a1522",
  land: "#16202c",
  landStroke: "#243244",
  atmosphere: "#2f6d9e",

  /** Visited-country fill, lightest to strongest. Index chosen by relative trip count. */
  visitedRamp: ["#7a3c22", "#9c4a26", "#c25c2c", "#e8703a", "#ff8a52"],
  hovered: "#ffa46f",
  selected: "#ffb281",

  markerRing: "#e8703a",
  markerRingSelected: "#ffb281",
} as const;

/**
 * Picks a ramp step for a trip count.
 *
 * Relative to the member's own maximum rather than an absolute threshold: someone with
 * two trips should still see contrast between one country and the other.
 */
export function visitedColor(travelCount: number, maxTravelCount: number): string {
  const ramp = globeTheme.visitedRamp;
  if (maxTravelCount <= 1) {
    return ramp[ramp.length - 1];
  }
  const ratio = (travelCount - 1) / (maxTravelCount - 1);
  const index = Math.min(ramp.length - 1, Math.round(ratio * (ramp.length - 1)));
  return ramp[index];
}
