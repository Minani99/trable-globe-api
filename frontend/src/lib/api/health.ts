import { apiGet } from "@/lib/api/client";
import type { HealthStatus } from "@/types";

export function fetchHealth(): Promise<HealthStatus> {
  return apiGet<HealthStatus>("/api/health");
}
