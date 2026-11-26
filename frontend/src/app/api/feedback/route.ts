import { forwardPublicAuth } from "@/lib/api/auth-route";

export function POST(request: Request) {
  return forwardPublicAuth(request, "/api/feedback");
}
