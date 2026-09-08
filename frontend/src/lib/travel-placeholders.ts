export function isPlaceholderPlaceName(value: string | null | undefined): boolean {
  const name = value?.trim() ?? "";
  return !name || name.includes("골라주세요");
}
