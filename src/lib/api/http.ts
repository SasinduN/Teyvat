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
    message: string,
    /** Field-level messages from a 400, keyed by path (`itinerary.2.title`). */
    readonly fields?: Record<string, string>
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

async function request(path: string, init: RequestInit): Promise<{ res: Response; body: unknown }> {
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      headers: { Accept: 'application/json', ...init.headers }
    });
  } catch {
    throw new ApiRequestError(0, 'unreachable', UNREACHABLE);
  }

  // 204 has no body, and that is success, not a parse failure.
  const body: unknown = res.status === 204 ? null : await res.json().catch(() => undefined);

  if (res.ok && body !== undefined) return { res, body };

  if (isErrorPayload(body)) {
    throw new ApiRequestError(res.status, body.error.code, body.error.message, body.error.fields);
  }
  throw new ApiRequestError(res.status, 'unreachable', UNREACHABLE);
}

export async function getJson<T>(path: string): Promise<T> {
  const { body } = await request(path, { method: 'GET' });
  return body as T;
}

/**
 * A write with an optional JSON body. The browser adds `Origin` to every
 * non-GET request on its own, which is what the server's same-origin check
 * reads, and sends the session cookie because the request is same-origin.
 *
 * Resolves to `null` for a 204.
 */
async function sendJson<T>(method: string, path: string, payload?: unknown): Promise<T> {
  const { body } = await request(path, {
    method,
    ...(payload === undefined
      ? {}
      : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
  });
  return body as T;
}

export const postJson = <T>(path: string, payload?: unknown) => sendJson<T>('POST', path, payload);
export const putJson = <T>(path: string, payload?: unknown) => sendJson<T>('PUT', path, payload);
export const patchJson = <T>(path: string, payload?: unknown) => sendJson<T>('PATCH', path, payload);
export const deleteJson = <T>(path: string) => sendJson<T>('DELETE', path);
