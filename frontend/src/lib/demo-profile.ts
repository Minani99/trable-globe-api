import { siteConfig } from "@/lib/config";
import type { UserProfile } from "@/types";

export const demoProfileCopy = {
  displayName: "샘플 여행자",
  bio: "여러 나라의 계획과 기록이 지구본에 쌓이는 모습을 미리 둘러보는 공개 샘플입니다.",
} as const;

/**
 * The public showcase must read as product demo data, never as a real member.
 *
 * Keeping this presentation guard in the frontend also updates an older hosted database
 * immediately, even before its optional demo seed is refreshed.
 */
export function presentDemoProfile(profile: UserProfile): UserProfile {
  if (profile.username.toLowerCase() !== siteConfig.demoUsername) return profile;

  return {
    ...profile,
    displayName: demoProfileCopy.displayName,
    bio: demoProfileCopy.bio,
  };
}

export function isDemoProfile(username: string): boolean {
  return username.toLowerCase() === siteConfig.demoUsername;
}
