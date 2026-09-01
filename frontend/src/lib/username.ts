export const USERNAME_PATTERN = /^[A-Za-z0-9_][A-Za-z0-9._-]{1,29}$/;

const RESERVED_USERNAMES = new Set([
  "_next", "about", "admin", "api", "discover", "feedback", "favicon.ico",
  "forgot-password", "globe", "help", "icon.svg", "login", "privacy", "register",
  "reset-password", "robots.txt", "settings", "sitemap.xml", "studio", "support",
  "terms", "traveler", "verify-email", "www",
]);

export function normalizeUsernameInput(value: string): string {
  return value.toLowerCase();
}

export function validateUsername(value: string): string | null {
  const username = value.trim().toLowerCase();
  if (!username) return "사용자명을 입력해 주세요.";
  if (!USERNAME_PATTERN.test(username)) {
    return "영문·숫자·밑줄로 시작하는 2~30자로 입력해 주세요.";
  }
  if (RESERVED_USERNAMES.has(username)) {
    return "서비스에서 사용하는 이름이라 다른 사용자명을 선택해 주세요.";
  }
  return null;
}
