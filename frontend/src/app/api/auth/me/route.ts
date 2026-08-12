import { forwardWithSession, passThrough } from "@/lib/api/auth-route";

export async function GET() {
  return passThrough(await forwardWithSession("/api/auth/me"));
}
