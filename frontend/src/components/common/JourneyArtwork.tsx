import { TravelImage } from "./TravelImage";
import styles from "./JourneyArtwork.module.css";

export function JourneyArtwork({ src, label, alt, city, country, className = "" }: {
  src?: string | null; label: string; alt: string; city?: string | null; country?: string | null; className?: string;
}) {
  return <TravelImage src={src ?? null} alt={alt} city={city} country={country}
    className={`${styles.photo} ${className}`} fallbackLabel={label} fallbackVariant="map" />;
}
