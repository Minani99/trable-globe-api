const UNSAFE_PUBLIC_NAME = /[<>\u0000-\u001f\u007f]/;

/**
 * Keeps legacy or imported profile data from leaking markup-looking text into
 * public discovery surfaces. New values are validated at write time as well.
 */
export function publicDisplayName(value: string | null | undefined, fallback = "여행자") {
  const normalized = value?.replace(/\s+/g, " ").trim() ?? "";
  if (!normalized || UNSAFE_PUBLIC_NAME.test(normalized)) return fallback;
  return normalized.slice(0, 60);
}
