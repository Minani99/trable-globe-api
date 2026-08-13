import { forwardPublicAuth } from "@/lib/api/auth-route";

export async function POST(request: Request) {
  return forwardPublicAuth(request, "/api/auth/password/forgot");
}
