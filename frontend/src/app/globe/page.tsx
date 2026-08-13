import { redirect } from "next/navigation";

import { getCurrentMember } from "@/lib/api/server-session";
import { profilePath, siteConfig } from "@/lib/config";

export default async function GlobeEntryPage() {
  const member = await getCurrentMember();
  redirect(profilePath(member?.username ?? siteConfig.demoUsername));
}
