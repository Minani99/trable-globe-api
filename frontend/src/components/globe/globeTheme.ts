/**
 * Colours for the WebGL scene.
 *
 * WebGL materials cannot read CSS custom properties, so these mirror the tokens in
 * globals.css by hand. Change one, change the other - they are meant to look like the
 * same surface.
 */
export const globeThemes = {
  light: {
    ocean: "#78c4e2",
    land: "#e3eadb",
    landStroke: "#a8bdc0",
    atmosphere: "#80d5f3",
    side: "rgba(91, 135, 148, 0.45)",
    emissive: "#09232e",
    specular: "#e8fbff",
    shininess: 18,
    visitedRamp: ["#f2c5ae", "#eda584", "#e98a61", "#e8703a", "#cf5425"],
    hovered: "#f37f4b",
    selected: "#c94619",
  },
  dark: {
    ocean: "#0a1522",
    land: "#16202c",
    landStroke: "#243244",
    atmosphere: "#2f6d9e",
    side: "rgba(10, 21, 34, 0.55)",
    emissive: "#040a12",
    specular: "#16283c",
    shininess: 8,
    visitedRamp: ["#7a3c22", "#9c4a26", "#c25c2c", "#e8703a", "#ff8a52"],
    hovered: "#ffa46f",
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
