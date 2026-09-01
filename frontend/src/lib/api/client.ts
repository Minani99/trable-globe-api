import { getApiBaseUrl } from "@/lib/config";

/** Shape every `/api` endpoint returns. */
export interface ApiEnvelope<T> {
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
  readonly requestId: string | null;
  fieldErrors: { field: string; message: string }[] = [];

  constructor(
    status: number,
    message: string,
    code: string | null = null,
    requestId: string | null = null,
  ) {
    super(requestId ? `${message} (요청 번호: ${requestId})` : message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.requestId = requestId;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }

  get isUnreachable(): boolean {
    return this.status === 0;
  }
}

/**
 * How long to wait before treating the API as unreachable.
 *
 * A misconfigured or sleeping backend does not refuse the connection - it accepts and
 * never answers. Without a deadline the page hangs until the hosting platform kills the
 * request. Render's free cold start can exceed the old eight-second limit, so profile
 * routes keep their loading UI visible long enough for a healthy instance to wake.
 */
// A free Render instance can take tens of seconds to wake. Keep the route-level
// loading UI visible during that first request instead of turning a healthy cold
// start into an error that only succeeds after a manual refresh.
const REQUEST_TIMEOUT_MS = 55_000;

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
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "TimeoutError";
    // The visitor only sees a generic message, so log the target for the server logs -
    // an unset API_BASE_URL shows up here as a localhost URL.
    console.error(
      `[api] ${timedOut ? `no response within ${REQUEST_TIMEOUT_MS}ms` : "request failed"}: ${url}`,
    );
    throw new ApiError(
      0,
      timedOut
        ? `API 응답이 없습니다 (${REQUEST_TIMEOUT_MS / 1000}초 초과): ${url}`
        : `API에 연결할 수 없습니다: ${url}`,
    );
  }

  const envelope = await readEnvelope<T>(response);
  const requestId = response.headers.get("x-request-id");

  if (!response.ok || !envelope?.success) {
    throw new ApiError(
      response.status,
      envelope?.message ?? `요청이 실패했습니다 (HTTP ${response.status})`,
      envelope?.error?.code ?? null,
      requestId,
    );
  }

  if (envelope.data === null) {
    throw new ApiError(response.status, "응답 본문이 비어 있습니다.", null, requestId);
  }

  return envelope.data;
}

/** Authenticated same-origin GET through the cookie-backed Next.js proxy. */
export async function apiSessionGet<T>(path: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      credentials: "same-origin",
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    throw new ApiError(0, "서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.");
  }
  const envelope = await readEnvelope<T>(response);
  const requestId = response.headers.get("x-request-id");
  if (!response.ok || !envelope?.success || envelope.data === null) {
    throw new ApiError(
      response.status,
      envelope?.message ?? `요청이 실패했습니다 (HTTP ${response.status})`,
      envelope?.error?.code ?? null,
      requestId,
    );
  }
  return envelope.data;
}

/** Same-origin mutation helper used by the HttpOnly-cookie BFF routes. */
export async function apiMutation<T>(
  path: string,
  method: "POST" | "PUT" | "PATCH" | "DELETE",
  body?: unknown,
): Promise<T | null> {
  let response: Response;
  try {
    response = await fetch(path, {
      method,
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    throw new ApiError(0, "서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.");
  }

  const envelope = await readEnvelope<T>(response);
  const requestId = response.headers.get("x-request-id");
  if (!response.ok || !envelope?.success) {
    const error = new ApiError(
      response.status,
      envelope?.message ?? `요청이 실패했습니다 (HTTP ${response.status})`,
      envelope?.error?.code ?? null,
      requestId,
    );
    Object.assign(error, { fieldErrors: envelope?.error?.fieldErrors ?? [] });
    throw error;
  }
  return envelope.data;
}

/** Tolerates a non-JSON body (proxy error page, empty 500) instead of throwing a SyntaxError. */
export async function readEnvelope<T>(response: Response): Promise<ApiEnvelope<T> | null> {
  try {
    return (await response.json()) as ApiEnvelope<T>;
  } catch {
    return null;
  }
}
