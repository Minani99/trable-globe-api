import { Icon } from "@/components/common/Icon";
import { weatherIconName, weatherTone } from "@/lib/weather";

/** Weather icon tinted by condition (sun, cloud, rain, snow, storm). */
export function WeatherIcon({ code, className }: { code: number; className?: string }) {
  return <Icon name={weatherIconName(code)} className={`weather-icon is-${weatherTone(code)}${className ? ` ${className}` : ""}`} />;
}
