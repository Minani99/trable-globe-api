import { Icon, type IconName } from "@/components/common/Icon";

/** Compatibility name for labeled actions; every glyph uses the shared icon set. */
export function AppIcon({ name, size = 20, className = "" }: { name: IconName | "drag"; size?: number; className?: string }) {
  return <Icon name={name === "drag" ? "grip" : name} size={size} className={`app-icon ${className}`.trim()} />;
}
