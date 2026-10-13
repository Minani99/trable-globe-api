import { TravelImage } from "./TravelImage";
import styles from "./JourneyArtwork.module.css";

/** Personal covers stay personal; trips without photos get a decorative route. */
export function JourneyArtwork({ src, label, alt, className = "" }: {
  src?: string | null; label: string; alt: string; className?: string;
}) {
  if (src) return <TravelImage src={src} alt={alt} className={`${styles.photo} ${className}`} fallbackLabel={label} />;
  return <div className={`${styles.map} ${className}`} role="img" aria-label={alt}>
    <svg viewBox="0 0 360 260" fill="none" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
      <path className={styles.water} d="M250-20c-85 48 19 110-48 157s-110 29-120 140h300V-20Z" />
      <g className={styles.roads}><path d="m-20 60 360 125M-20 150l310-40M52-10l68 280M180-20l-27 310M-20 216 375-169"/><path d="m-20 76 355 126M-20 168l310-39M69-10l65 280" /></g>
      <path className={styles.route} d="M65 175c-30-75 120-5 86-82s124-65 128 25" />
      <g className={styles.pins}><circle cx="65" cy="175" r="6"/><circle cx="151" cy="93" r="6"/><circle cx="279" cy="118" r="6"/></g>
    </svg>
    <span aria-hidden="true">{label}</span>
  </div>;
}
