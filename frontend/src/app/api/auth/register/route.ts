import { handleAuthStart } from "@/lib/api/auth-route";

export async function POST(request: Request) {
  return handleAuthStart(request, "register");
}
