import { redirect } from "next/navigation";

import { getCurrentMember } from "@/lib/api/server-session";
import { profilePath, siteConfig } from "@/lib/config";

export const dynamic = "force-dynamic";

export default async function GlobeEntryPage() {
  let member = null;
  try {
    member = await getCurrentMember();
  } catch (error) {
    console.error("[globe] Could not resolve the current member; opening the public sample.", error);
  }
  redirect(profilePath(member?.username ?? siteConfig.demoUsername));
}
