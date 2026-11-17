import styles from "./JourneyArtwork.module.css";

/**
 * Light, map-like artwork for trips without a cover photo.
 *
 * Several route layouts (and their mirror images) are picked deterministically from `seed`, so a profile with many
 * photo-less trips still reads as distinct cards rather than one repeated tile - and none
 * of them can be mistaken for a broken or still-loading image.
 */
const LAYOUTS = [
  { route: "M65 175c-30-75 120-5 86-82s124-65 128 25", pins: [[65, 175], [151, 93], [279, 118]] },
  { route: "M48 92c62 8 58 92 128 82s70-96 136-58", pins: [[48, 92], [176, 174], [312, 116]] },
  { route: "M86 196c22-58-40-110 40-128s96 64 168 20", pins: [[86, 196], [126, 68], [294, 88]] },
  { route: "M40 150c50-40 90 30 140-10s70-90 140-60", pins: [[40, 150], [180, 140], [320, 80]] },
  { route: "M70 70c40 60 110 20 120 90s90 40 120-20", pins: [[70, 70], [190, 160], [310, 140]] },
] as const;

/** Coastlines, so photo-less trips also differ in where the water sits. */
const WATERS = [
  "M250-20c-85 48 19 110-48 157s-110 29-120 140h300V-20Z",
  "M-20 190c70-30 120 20 190-10s110-60 210-20v120H-20Z",
  "M380 -20c-60 40-40 120-110 150s-30 90-70 150h180V-20Z",
] as const;

export function JourneyMapArt({ seed = "", label, className = "", fill = false }: {
  seed?: string;
  /** Absolutely fill the nearest positioned ancestor. */
  fill?: boolean;
  /** Short visible caption, e.g. a country code. Omit when the caller overlays its own text. */
  label?: string;
  className?: string;
}) {
  const seedHash = hash(seed);
  // Route, coastline and mirroring are picked from independent parts of the hash:
  // 5 x 3 x 2 = 30 combinations, so neighbouring cards rarely look alike.
  const layout = LAYOUTS[seedHash % LAYOUTS.length];
  const water = WATERS[Math.floor(seedHash / LAYOUTS.length) % WATERS.length];
  const mirrored = Math.floor(seedHash / (LAYOUTS.length * WATERS.length)) % 2 === 1;
  return (
    <div className={`${styles.map}${fill ? ` ${styles.fill}` : ""} ${className}`} aria-hidden="true">
      <svg viewBox="0 0 360 260" fill="none" preserveAspectRatio="xMidYMid slice" style={mirrored ? { transform: "scaleX(-1)" } : undefined}>
        <path className={styles.water} d={water} />
        <g className={styles.roads}><path d="m-20 60 360 125M-20 150l310-40M52-10l68 280M180-20l-27 310M-20 216 375-169" /><path d="m-20 76 355 126M-20 168l310-39M69-10l65 280" /></g>
        <path className={styles.route} d={layout.route} />
        <g className={styles.pins}>{layout.pins.map(([cx, cy]) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="6" />)}</g>
      </svg>
      {label ? <span>{label}</span> : null}
    </div>
  );
}

function hash(value: string): number {
  let result = 0;
  for (let i = 0; i < value.length; i += 1) result = (result * 31 + value.charCodeAt(i)) % 100000;
  return result;
}
