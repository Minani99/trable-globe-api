/**
 * Colours for the WebGL scene.
 *
 * WebGL materials cannot read CSS custom properties, so these mirror the tokens in
 * globals.css by hand. Change one, change the other - they are meant to look like the
 * same surface.
 */
export const globeThemes = {
  light: {
    ocean: "#a5c7cb",
    land: "#e3eadb",
    landStroke: "#a8bdc0",
    atmosphere: "#b8d4d2",
    side: "rgba(91, 135, 148, 0.45)",
    emissive: "#09232e",
    specular: "#e4ebe8",
    shininess: 6,
    visitedRamp: ["#b5cbb1", "#98b699", "#78a083", "#568568", "#35634d"],
    hovered: "#92b59a",
    recent: "#729e7c",
    selected: "#35634d",
  },
  dark: {
    ocean: "#102838",
    land: "#2a3d47",
    landStroke: "#58717d",
    atmosphere: "#4a93b5",
    side: "rgba(18, 39, 52, 0.7)",
    emissive: "#08151d",
    specular: "#7896a3",
    shininess: 16,
    visitedRamp: ["#7a3c22", "#9c4a26", "#c25c2c", "#e8703a", "#ff8a52"],
    hovered: "#ffa46f",
    recent: "#f7945f",
    selected: "#ffb281",
  },
} as const;

export type GlobeTheme = (typeof globeThemes)[keyof typeof globeThemes];

/**
 * Picks a ramp step for a trip count.
 *
 * Relative to the member's own maximum rather than an absolute threshold: someone with
 * two trips should still see contrast between one country and the other.
 */
export function visitedColor(
  travelCount: number,
  maxTravelCount: number,
  theme: GlobeTheme,
): string {
  const ramp = theme.visitedRamp;
  if (maxTravelCount <= 1) {
    return ramp[ramp.length - 1];
  }
  const ratio = (travelCount - 1) / (maxTravelCount - 1);
  const index = Math.min(ramp.length - 1, Math.round(ratio * (ramp.length - 1)));
  return ramp[index];
}
