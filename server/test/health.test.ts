// Must be first: points the server at the test database and removes every
// R2_* variable, or refuses to run.
import './test-db';

import assert from 'node:assert/strict';
import { after, before, describe, mock, test } from 'node:test';

import { createApp } from '../src/app';
import { pool } from '../src/db';
import type { ObjectStore } from '../src/media/store';
import { assertConnectedToTestDatabase, listen, migrateTestDatabase, type RunningApp } from './helpers';

/**
 * Railway's healthcheck decides whether a deploy goes live. Only the
 * database may fail it: images are informational, and an R2 outage must
 * never take the site down or block a deploy.
 */

const BASE = 'https://test-bucket.r2.dev';

/** A store whose `ping` behaves as told. Each test gets a fresh one, so no cached result carries over. */
function storeWhosePing(ping: () => Promise<boolean>): ObjectStore {
  return {
    put: async () => undefined,
    delete: async () => undefined,
    ping
  };
}

async function health(store: ObjectStore | null): Promise<{ status: number; body: Record<string, unknown> }> {
  const app: RunningApp = await listen(
    createApp({ media: store ? { store, publicBaseUrl: BASE } : null })
  );
  try {
    const res = await fetch(`${app.baseUrl}/api/health`);
    return { status: res.status, body: (await res.json()) as Record<string, unknown> };
  } finally {
    await app.close();
  }
}

before(async () => {
  migrateTestDatabase();
  await assertConnectedToTestDatabase();
});

after(async () => {
  await pool.end();
});

describe('/api/health', () => {
  test('media not configured: 200', async () => {
    const { status, body } = await health(null);
    assert.equal(status, 200);
    assert.equal(body.database, 'up');
    assert.equal(body.media, 'not_configured');
  });

  test('media up: 200', async () => {
    const { status, body } = await health(storeWhosePing(async () => true));
    assert.equal(status, 200);
    assert.equal(body.media, 'up');
  });

  test('media down (R2 answers no): 200', async () => {
    const { status, body } = await health(storeWhosePing(async () => false));
    assert.equal(status, 200);
    assert.equal(body.media, 'down');
  });

  test('media check rejects: still 200', async () => {
    const { status, body } = await health(
      storeWhosePing(async () => {
        throw new Error('R2 exploded');
      })
    );
    assert.equal(status, 200);
    assert.equal(body.media, 'down');
  });

  test('media check throws synchronously: still 200', async () => {
    const { status, body } = await health(
      storeWhosePing((() => {
        throw new Error('R2 client misconfigured');
      }) as () => Promise<boolean>)
    );
    assert.equal(status, 200);
    assert.equal(body.media, 'down');
  });

  test('media check hangs: 200 within the ping timeout', async () => {
    const started = Date.now();
    const { status, body } = await health(storeWhosePing(() => new Promise<boolean>(() => undefined)));
    assert.equal(status, 200);
    assert.equal(body.media, 'down');
    assert.ok(Date.now() - started < 5000, `took ${Date.now() - started} ms`);
  });

  test('database down: fails, whatever media says', async () => {
    const query = mock.method(pool, 'query', async () => {
      throw new Error('connection refused');
    });
    const error = mock.method(console, 'error', () => undefined);
    try {
      for (const store of [storeWhosePing(async () => true), null]) {
        const { status, body } = await health(store);
        assert.equal(status, 500);
        assert.deepEqual(body, { error: { code: 'internal', message: 'Database unreachable.' } });
      }
    } finally {
      query.mock.restore();
      error.mock.restore();
    }
  });
});
