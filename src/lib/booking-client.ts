import { BOOKING_API, type BookingRecord } from '@shared/booking';
import { ApiRequestError } from './api/http';

/**
 * A booking API call. Same origin, with the guest cookie; 20 s at most. A
 * timeout can't say whether a new request arrived, so its message says to
 * retry the same request (same `Idempotency-Key`) or check My requests.
 */
export async function bookingRequest<T>(path: string, method = 'GET', body?: unknown, key?: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method,
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(key ? { 'Idempotency-Key': key } : {})
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(20_000)
    });
  } catch {
    throw new ApiRequestError(
      0,
      'unreachable',
      'The request timed out or the network is unavailable. A submission may have reached us. Retry the same request or check My requests.'
    );
  }
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiRequestError(
      response.status,
      payload?.error?.code ?? 'internal',
      payload?.error?.message ?? 'The server could not complete this request.',
      payload?.error?.fields
    );
  }
  if (payload === null) throw new ApiRequestError(0, 'unreachable', 'The server response could not be read. Check My requests before submitting again.');
  return payload as T;
}

export const guestSession = () => bookingRequest<{ ok: true }>(`${BOOKING_API.root}/session`, 'POST');
export const guestBookings = () => bookingRequest<{ bookings: BookingRecord[] }>(BOOKING_API.root);
