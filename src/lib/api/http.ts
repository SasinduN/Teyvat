/**
 * The browser's side of the `/api/*` contract.
 *
 * Every route answers a failure with `ApiErrorPayload` (`shared/api.ts`), so
 * this is the one place that turns a non-2xx into an Error with a readable
 * message. A response that is not our JSON at all — typically a 502 from the
 * Vite dev proxy because nothing is listening on :8081 — gets its own message,
 * rather than surfacing as a JSON parse error.
 */
import type { ApiErrorCode, ApiErrorPayload } from '@shared/api';

export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiErrorCode | 'unreachable',
    message: string
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

const UNREACHABLE = 'The server could not be reached. Please try again in a moment.';

function isErrorPayload(body: unknown): body is ApiErrorPayload {
  return (
    typeof body === 'object' &&
    body !== null &&
    typeof (body as ApiErrorPayload).error?.message === 'string'
  );
}

export async function getJson<T>(path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, { headers: { Accept: 'application/json' } });
  } catch {
    throw new ApiRequestError(0, 'unreachable', UNREACHABLE);
  }

  const body: unknown = await res.json().catch(() => undefined);

  if (res.ok && body !== undefined) return body as T;

  if (isErrorPayload(body)) {
    throw new ApiRequestError(res.status, body.error.code, body.error.message);
  }
  throw new ApiRequestError(res.status, 'unreachable', UNREACHABLE);
}
