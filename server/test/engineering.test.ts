import './test-db';
import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, test } from 'node:test';
import { DESTINATIONS } from '../../scripts/fixtures/destinations';
import { buildSampleJourney, readSavedJourney, SAVED_PLAN_KEY } from '../../src/lib/planner';
import { matchesTravelTiming, TRAVEL_TIMINGS } from '../../src/lib/travelTiming';
import { createApp } from '../src/app';
import { pool } from '../src/db';
import { assertConnectedToTestDatabase, browserHeaders, createUser, listen, login, migrateTestDatabase, PASSWORD, resetAuthTables, resetContent, sessionTokenFrom, withSession, type RunningApp } from './helpers';
import { HOOK_TIMEOUT } from './timeouts';

let app: RunningApp, token: string;
before(async () => {
  migrateTestDatabase();
  await assertConnectedToTestDatabase();
  await resetAuthTables(); await resetContent(); await createUser();
  app = await listen(createApp({ media: null, notifier: { newInquiry: () => undefined } }));
  token = sessionTokenFrom(await login(app, 'admin@example.test', PASSWORD))!;
}, HOOK_TIMEOUT);
beforeEach(async () => { await pool.query('truncate public.newsletter_subscribers, public.newsletter_attempts'); }, HOOK_TIMEOUT);
after(async () => { await app?.close(); await pool.end(); }, HOOK_TIMEOUT);

const subscribe = (body: unknown, origin?: string) => fetch(`${app.baseUrl}/api/newsletter`, {
  method: 'POST', headers: { ...browserHeaders(app, '203.0.113.80'), ...(origin ? { Origin: origin } : {}) }, body: JSON.stringify(body)
});

describe('newsletter persistence and protection', () => {
  test('normalizes and persists a subscription, with idempotent duplicate response', async () => {
    assert.equal((await subscribe({ email: '  Reader@Example.test  ' })).status, 201);
    assert.equal((await subscribe({ email: 'reader@example.test' })).status, 201);
    const { rows } = await pool.query('select email from public.newsletter_subscribers');
    assert.deepEqual(rows, [{ email: 'reader@example.test' }]);
  });
  test('rejects invalid email and a foreign origin without inserting', async () => {
    assert.equal((await subscribe({ email: 'not-an-email' })).status, 400);
    assert.equal((await subscribe({ email: 'reader@example.test' }, 'https://foreign.example')).status, 403);
    assert.equal((await pool.query('select * from public.newsletter_subscribers')).rowCount, 0);
  });
  test('honeypot does not subscribe and duplicate responses reveal no membership', async () => {
    const response = await subscribe({ email: 'bot@example.test', website: 'spam' });
    assert.equal(response.status, 201); assert.deepEqual(await response.json(), { ok: true });
    assert.equal((await pool.query('select * from public.newsletter_subscribers')).rowCount, 0);
  });
  test('parallel requests are atomically limited to ten subscriptions', async () => {
    const responses = await Promise.all(Array.from({ length: 12 }, (_, i) => subscribe({ email: `reader${i}@example.test` })));
    assert.equal(responses.filter(r => r.status === 201).length, 10);
    assert.equal(responses.filter(r => r.status === 429).length, 2);
    assert.equal(responses.find(r => r.status === 429)?.headers.get('retry-after'), '900');
    assert.equal((await pool.query('select * from public.newsletter_subscribers')).rowCount, 10);
  });
});

describe('planner and seasonal discovery', () => {
  test('region and style change actual destination choices', () => {
    const south = buildSampleJourney(DESTINATIONS, { style: 'Relax', duration: '6–8 days', region: 'South Coast' });
    const north = buildSampleJourney(DESTINATIONS, { style: 'Culture', duration: '6–8 days', region: 'Far North' });
    assert.equal(south.length, 7); assert.equal(north.length, 7);
    assert.ok(south.every(d => DESTINATIONS.find(p => p.name === d.title)?.region === 'South'));
    assert.ok(north.every(d => DESTINATIONS.find(p => p.name === d.title)?.region === 'North'));
    const relax = buildSampleJourney(DESTINATIONS, { style: 'Relax', duration: '3–5 days', region: 'Around the Island' });
    const wildlife = buildSampleJourney(DESTINATIONS, { style: 'Wildlife', duration: '3–5 days', region: 'Around the Island' });
    assert.notEqual(relax[0].title, wildlife[0].title);
  });
  test('15+ generates 16 days, and empty published content creates no fictional places', () => {
    const plan = buildSampleJourney(DESTINATIONS, { style: 'Adventure', duration: '15+ days', region: 'Central Highlands' });
    assert.equal(plan.length, 16); assert.equal(plan[15].day, 16);
    assert.deepEqual(buildSampleJourney([], { style: 'Relax', duration: '3–5 days', region: 'South Coast' }), []);
  });
  test('saved preferences survive reload and malformed/private storage fails safely', () => {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    const preferences = { style: 'Wildlife', duration: '15+ days', region: 'South Coast' };
    try {
      Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (key: string) => key === SAVED_PLAN_KEY ? JSON.stringify(preferences) : null } });
      assert.deepEqual(readSavedJourney(), preferences);
      Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => '{bad json' } });
      assert.equal(readSavedJourney(), null);
      Object.defineProperty(globalThis, 'localStorage', { configurable: true, get: () => { throw Error('storage blocked'); } });
      assert.equal(readSavedJourney(), null);
    } finally {
      if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor);
      else Reflect.deleteProperty(globalThis, 'localStorage');
    }
  });
  test('seasonal ranges wrap December, include multiple seasons and preserve unknown metadata', () => {
    assert.equal(matchesTravelTiming('May – September', TRAVEL_TIMINGS[1]), false);
    assert.equal(matchesTravelTiming('November – April', TRAVEL_TIMINGS[1]), true);
    assert.equal(matchesTravelTiming('May – September', TRAVEL_TIMINGS[2]), true);
    assert.equal(matchesTravelTiming('June – September & December – March', TRAVEL_TIMINGS[1]), true);
    assert.equal(matchesTravelTiming('Year-round', TRAVEL_TIMINGS[3]), true);
    assert.equal(matchesTravelTiming('Ask a local specialist', TRAVEL_TIMINGS[3]), true);
  });
});

test('a revision one microsecond away is rejected; the exact revision saves and returns another lossless token', async () => {
  const get = await fetch(`${app.baseUrl}/api/admin/content/destinations/ella`, { headers: withSession(token) });
  assert.equal(get.status, 200);
  const row = await get.json() as Record<string, unknown> & { updated_at: string };
  assert.match(row.updated_at, /\.\d{6}Z$/);
  const { id: _id, created_at: _created, updated_at: _updated, sort_order: _order, ...values } = row;
  const revision = row.updated_at.replace(/(\d{6})Z$/, (_, digits: string) => `${String(Number(digits) === 999999 ? 999998 : Number(digits) + 1).padStart(6, '0')}Z`);
  const save = (expectedUpdatedAt: string) => fetch(`${app.baseUrl}/api/admin/content/destinations/ella`, {
    method: 'PUT', headers: { ...browserHeaders(app), ...withSession(token) }, body: JSON.stringify({ values, expectedUpdatedAt })
  });
  assert.equal((await save(revision)).status, 409);
  const exact = await save(row.updated_at); assert.equal(exact.status, 200);
  const updated = await exact.json() as { updated_at: string };
  assert.match(updated.updated_at, /\.\d{6}Z$/);
  assert.equal((await save(row.updated_at)).status, 409);
  assert.equal((await save(updated.updated_at)).status, 200);
});
