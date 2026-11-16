import { JourneyMapArt } from "./JourneyMapArt";
import { TravelImage } from "./TravelImage";
import styles from "./JourneyArtwork.module.css";

/** Personal covers stay personal; trips without photos get a decorative route. */
export function JourneyArtwork({ src, label, alt, className = "" }: {
  src?: string | null; label: string; alt: string; className?: string;
}) {
  if (src) return <TravelImage src={src} alt={alt} className={`${styles.photo} ${className}`} fallbackLabel={label} fallbackVariant="map" />;
  return <div role="img" aria-label={alt} className={className} style={{ position: "relative" }}>
    <JourneyMapArt seed={alt} label={label} fill />
  </div>;
}
