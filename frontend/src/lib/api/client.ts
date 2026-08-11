import { getApiBaseUrl } from "@/lib/config";

/** Shape every `/api` endpoint returns. */
interface ApiEnvelope<T> {
  success: boolean;
  data: T | null;
  message: string | null;
  error?: {
    code: string;
    fieldErrors?: { field: string; message: string }[];
  };
}

/**
 * A failed API call.
 *
 * `status === 0` means the request never reached the server - a different problem from a
 * 404, and one the UI phrases differently ("API에 연결할 수 없습니다" vs "찾을 수 없습니다").
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string | null;

  constructor(status: number, message: string, code: string | null = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }

  get isUnreachable(): boolean {
    return this.status === 0;
  }
}

/**
 * GETs a path from the API and unwraps the response envelope.
 *
 * Not cached: a profile is personal, frequently edited data and a stale globe is worse
 * than an extra request. Swap in `next: { revalidate: n }` once traffic justifies it.
 */
export async function apiGet<T>(path: string): Promise<T> {
  const url = `${getApiBaseUrl()}${path}`;

  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
  } catch {
    throw new ApiError(0, `API에 연결할 수 없습니다: ${url}`);
  }

  const envelope = await readEnvelope<T>(response);

  if (!response.ok || !envelope?.success) {
    throw new ApiError(
      response.status,
      envelope?.message ?? `요청이 실패했습니다 (HTTP ${response.status})`,
      envelope?.error?.code ?? null,
    );
  }

  if (envelope.data === null) {
    throw new ApiError(response.status, "응답 본문이 비어 있습니다.");
  }

  return envelope.data;
}

/** Tolerates a non-JSON body (proxy error page, empty 500) instead of throwing a SyntaxError. */
async function readEnvelope<T>(response: Response): Promise<ApiEnvelope<T> | null> {
  try {
    return (await response.json()) as ApiEnvelope<T>;
  } catch {
    return null;
  }
}
