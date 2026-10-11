/** The booking API client (src/lib/booking-client.ts). No server. */
import assert from 'node:assert/strict';
import { mock, test } from 'node:test';

import { bookingRequest } from '../../src/lib/booking-client';

test('a timeout says the request may have arrived, and keeps the retry key', async () => {
  let key: string | undefined;
  const m = mock.method(globalThis, 'fetch', async (_path: string, init: RequestInit) => {
    key = (init.headers as Record<string, string>)['Idempotency-Key'];
    assert.ok(init.signal);
    throw new DOMException('mock timeout', 'TimeoutError');
  });
  try {
    await assert.rejects(bookingRequest('/api/bookings', 'POST', {}, 'test-retry-key'), /may have reached us.*Retry/);
    assert.equal(key, 'test-retry-key');
  } finally {
    m.mock.restore();
  }
});
