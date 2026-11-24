import { TravelImage } from "./TravelImage";
import styles from "./JourneyArtwork.module.css";

export function JourneyArtwork({ src, sizes, alt, city, country, className = "" }: {
  src?: string | null; sizes?: string; alt: string; city?: string | null; country?: string | null; className?: string;
}) {
  return <TravelImage src={src ?? null} alt={alt} city={city} country={country}
    className={`${styles.photo} ${className}`} sizes={sizes} fallbackVariant="map" />;
}
