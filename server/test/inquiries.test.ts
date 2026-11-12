// Must be first: points the server at the test database and removes every
// R2_* and Resend variable, or refuses to run.
import './test-db';

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createServer, type IncomingMessage } from 'node:http';
import type { AddressInfo } from 'node:net';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, before, beforeEach, describe, mock, test } from 'node:test';

import { BRAND, emailSender, resolveBrand } from '../../shared/brand';
import type { InquiryRow } from '../../shared/database.types';
import { createApp } from '../src/app';
import { runSweep } from '../src/auth/sweep';
import { pool } from '../src/db';
import { readNotifyConfig } from '../src/env';
import { csvCell, inquiriesCsv } from '../src/inquiries/csv';
import {
  composeEmail,
  createNotifier,
  resendSender,
  SendFailed,
  type NotificationEmail
} from '../src/inquiries/notify';
import {
  assertConnectedToTestDatabase,
  createUser,
  listen,
  login,
  migrateTestDatabase,
  PASSWORD,
  resetAuthTables,
  sessionTokenFrom,
  withSession,
  type RunningApp
} from './helpers';
import { HOOK_TIMEOUT } from './timeouts';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

let app: RunningApp;
let token: string;
let notified = 0;

before(async () => {
  migrateTestDatabase();
  await assertConnectedToTestDatabase();
  app = await listen(createApp({ media: null, notifier: { newInquiry: () => void (notified += 1) } }));

  await resetAuthTables();
  await createUser();
  token = sessionTokenFrom(await login(app, 'admin@example.test', PASSWORD))!;
  assert.ok(token);
}, HOOK_TIMEOUT);

beforeEach(async () => {
  await pool.query('truncate public.inquiries, public.inquiry_attempts');
  notified = 0;
}, HOOK_TIMEOUT);

after(async () => {
  await app?.close();
  await pool.end();
}, HOOK_TIMEOUT);

/* ------------------------------------------------------------------ calls */

const VALID = {
  name: 'Nimali Perera',
  email: 'nimali@example.test',
  phone: '+94 77 123 6478',
  travelers: '2 Adults',
  dates: 'Next 3 Months',
  subject: 'Experience: Safari in Yala',
  message: 'We would love a leopard safari.'
};

let ipCounter = 0;
/** A fresh address per call unless one is given, so tests don't trip the rate limit by accident. */
const nextIp = () => `198.18.${Math.floor(++ipCounter / 250)}.${(ipCounter % 250) + 1}`;

function submit(body: unknown, options: { ip?: string; origin?: string; raw?: string } = {}) {
  return fetch(`${app.baseUrl}/api/inquiries`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: options.origin ?? app.baseUrl,
      'X-Forwarded-For': options.ip ?? nextIp()
    },
    body: options.raw ?? JSON.stringify(body)
  });
}

function admin(method: string, path: string, body?: unknown, session = true) {
  return fetch(`${app.baseUrl}/api/admin/inquiries${path}`, {
    method,
    headers: {
      Origin: app.baseUrl,
      ...(session ? withSession(token) : {}),
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' })
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
}

async function stored(): Promise<InquiryRow[]> {
  return (await pool.query<InquiryRow>('select * from public.inquiries order by created_at')).rows;
}

async function inbox(query = ''): Promise<InquiryRow[]> {
  const res = await admin('GET', query);
  assert.equal(res.status, 200);
  return (await res.json()) as InquiryRow[];
}

/* ------------------------------------------------------------------ public */

describe('public submission', () => {
  test('stores the visitor fields only: status, notes, spam and closed_at are the server’s', async () => {
    const res = await submit({
      ...VALID,
      id: '00000000-0000-0000-0000-000000000001',
      status: 'closed',
      admin_notes: 'VIP, give a discount',
      spam: false,
      closed_at: '2020-01-01T00:00:00Z',
      created_at: '2020-01-01T00:00:00Z'
    });
    assert.equal(res.status, 201);
    assert.deepEqual(await res.json(), { ok: true });

    const [row] = await stored();
    assert.equal(row.status, 'new');
    assert.equal(row.admin_notes, null);
    assert.equal(row.spam, false);
    assert.equal(row.closed_at, null);
    assert.notEqual(row.id, '00000000-0000-0000-0000-000000000001');
    assert.ok(new Date(row.created_at).getFullYear() >= 2026);
    assert.equal(row.name, VALID.name);
    assert.equal(notified, 1);
  });

  test('a filled honeypot is stored as spam, answered the same, and never notifies', async () => {
    const res = await submit({ ...VALID, website: 'https://cheap-pills.example' });
    assert.equal(res.status, 201);
    assert.deepEqual(await res.json(), { ok: true });

    const [row] = await stored();
    assert.equal(row.spam, true);
    assert.equal(notified, 0);

    assert.equal((await inbox()).length, 0);
    assert.equal((await inbox('?spam=true')).length, 1);
  });

  test('validation: 400 with the field and a message a traveller understands', async () => {
    const cases: Array<[Record<string, unknown>, string, RegExp]> = [
      [{ name: '   ' }, 'name', /your name/],
      [{ name: 'x'.repeat(121) }, 'name', /120/],
      [{ email: 'not-an-email' }, 'email', /email address/],
      [{ phone: '1'.repeat(41) }, 'phone', /40/],
      [{ travelers: 'x'.repeat(81) }, 'travelers', /.+/],
      [{ dates: 'x'.repeat(81) }, 'dates', /.+/],
      [{ subject: 'x'.repeat(301) }, 'subject', /too long/],
      [{ message: 'x'.repeat(5001) }, 'message', /5,000/]
    ];
    for (const [change, field, message] of cases) {
      const res = await submit({ ...VALID, ...change });
      assert.equal(res.status, 400, field);
      const body = (await res.json()) as { error: { message: string; fields: Record<string, string> } };
      assert.ok(body.error.fields[field], `${field}: ${JSON.stringify(body.error.fields)}`);
      assert.match(body.error.message, message, field);
    }
    assert.equal((await stored()).length, 0);
  });

  test('cross-origin POST is refused and stores nothing', async () => {
    const res = await submit(VALID, { origin: 'https://evil.example' });
    assert.equal(res.status, 403);
    assert.equal((await stored()).length, 0);
  });
});

describe('rate limit', () => {
  test('the 6th submission from one IP in 15 minutes gets 429; another IP still gets through', async () => {
    const ip = '203.0.113.60';
    for (let i = 0; i < 5; i += 1) assert.equal((await submit(VALID, { ip })).status, 201);

    const res = await submit(VALID, { ip });
    assert.equal(res.status, 429);
    const retryAfter = Number(res.headers.get('retry-after'));
    assert.ok(retryAfter > 0 && retryAfter <= 15 * 60, String(retryAfter));
    assert.match(((await res.json()) as { error: { message: string } }).error.message, /Too many enquiries/);

    assert.equal((await submit(VALID, { ip: '203.0.113.61' })).status, 201);
    assert.equal((await stored()).length, 6);
  });

  test('20 in 24 hours: the 21st is refused for hours, not minutes', async () => {
    const ip = '203.0.113.70';
    await pool.query(
      `insert into public.inquiry_attempts (ip, attempted_at)
       select $1::inet, now() - interval '1 hour' - (n || ' minutes')::interval from generate_series(1, 19) n`,
      [ip]
    );
    assert.equal((await submit(VALID, { ip })).status, 201);

    const res = await submit(VALID, { ip });
    assert.equal(res.status, 429);
    assert.ok(Number(res.headers.get('retry-after')) > 60 * 60);
  });

  test('honeypot hits count towards the limit', async () => {
    const ip = '203.0.113.80';
    for (let i = 0; i < 5; i += 1) await submit({ ...VALID, website: 'x' }, { ip });
    assert.equal((await submit(VALID, { ip })).status, 429);
  });
});

/* ------------------------------------------------------------------- inbox */

describe('inbox', () => {
  test('every inbox endpoint is 401 without a session', async () => {
    const id = '00000000-0000-0000-0000-000000000000';
    const routes: Array<[string, string, unknown?]> = [
      ['GET', ''],
      ['GET', '?status=new'],
      ['GET', '/counts'],
      ['GET', '/export.csv'],
      ['GET', `/${id}`],
      ['PATCH', `/${id}`, { status: 'closed', expectedUpdatedAt: new Date().toISOString() }],
      ['DELETE', `/${id}`]
    ];
    for (const [method, path, body] of routes) {
      assert.equal((await admin(method, path, body, false)).status, 401, `${method} ${path}`);
    }
  });

  test('status changes set and clear closed_at; notes save; blank notes become NULL', async () => {
    await submit(VALID);
    let [row] = await inbox();

    let res = await admin('PATCH', `/${row.id}`, { status: 'closed', expectedUpdatedAt: row.updated_at });
    assert.equal(res.status, 200);
    row = (await res.json()) as InquiryRow;
    assert.equal(row.status, 'closed');
    assert.ok(row.closed_at);

    res = await admin('PATCH', `/${row.id}`, { status: 'contacted', expectedUpdatedAt: row.updated_at });
    row = (await res.json()) as InquiryRow;
    assert.equal(row.status, 'contacted');
    assert.equal(row.closed_at, null);

    res = await admin('PATCH', `/${row.id}`, { admin_notes: 'Called back on Monday', expectedUpdatedAt: row.updated_at });
    row = (await res.json()) as InquiryRow;
    assert.equal(row.admin_notes, 'Called back on Monday');
    assert.equal(row.status, 'contacted');

    res = await admin('PATCH', `/${row.id}`, { admin_notes: '   ', expectedUpdatedAt: row.updated_at });
    assert.equal(((await res.json()) as InquiryRow).admin_notes, null);
  });

  test('a stale PATCH gets 409 and changes nothing', async () => {
    await submit(VALID);
    const [row] = await inbox();
    assert.equal((await admin('PATCH', `/${row.id}`, { admin_notes: 'first', expectedUpdatedAt: row.updated_at })).status, 200);
    assert.equal((await admin('PATCH', `/${row.id}`, { admin_notes: 'second', expectedUpdatedAt: row.updated_at })).status, 409);
    assert.equal((await inbox())[0].admin_notes, 'first');
  });

  test('delete is permanent', async () => {
    await submit(VALID);
    const [row] = await inbox();
    assert.equal((await admin('DELETE', `/${row.id}`)).status, 204);
    assert.equal((await stored()).length, 0);
    assert.equal((await admin('DELETE', `/${row.id}`)).status, 404);
  });

  test('counts leave spam out of new; filters and search work, with % taken literally', async () => {
    await submit(VALID);
    await submit({ ...VALID, name: 'Second', email: 'second@example.test', subject: '100% custom tour' });
    await submit({ ...VALID, website: 'bot' });

    const counts = await (await admin('GET', '/counts')).json();
    assert.deepEqual(counts, { new: 2, contacted: 0, closed: 0, spam: 1 });

    assert.equal((await inbox('?status=new')).length, 2);
    assert.equal((await inbox('?status=closed')).length, 0);
    assert.deepEqual((await inbox('?search=%25')).map((r) => r.name), ['Second']);
    assert.deepEqual((await inbox('?search=nimali')).map((r) => r.name), [VALID.name]);
    assert.equal((await admin('GET', '?status=archived')).status, 400);
  });

  test('"Not spam" moves an enquiry into the inbox', async () => {
    await submit({ ...VALID, website: 'autofilled by accident' });
    const [row] = await inbox('?spam=true');
    const res = await admin('PATCH', `/${row.id}`, { spam: false, expectedUpdatedAt: row.updated_at });
    assert.equal(res.status, 200);
    assert.equal((await inbox()).length, 1);
  });
});

/* --------------------------------------------------------------------- CSV */

describe('CSV export', () => {
  test('formula starts get a leading apostrophe; quotes and newlines survive', () => {
    for (const start of ['=', '+', '-', '@', '\t', '\r']) {
      assert.equal(csvCell(`${start}SUM(A1)`), `"'${start}SUM(A1)"`, JSON.stringify(start));
    }
    assert.equal(csvCell('plain text'), '"plain text"');
    assert.equal(csvCell('He said "hi"\nthen left'), '"He said ""hi""\nthen left"');
    assert.equal(csvCell(null), '""');
  });

  test('a phone of only digits, spaces and + - ( ) is written as ="…" text; anything else is escaped', () => {
    // CSV-quoted, the cell ="+94 77 123 6478" is written "=""+94 77 123 6478""".
    for (const phone of ['+94 77 123 6478', '(011) 234-5678', '-94 11 2345678', '0771234567']) {
      assert.equal(csvCell(phone, { phone: true }), `"=""${phone}"""`, phone);
    }
    // Not a plain phone number: the usual rule. Formula starts get the apostrophe...
    for (const phone of ['+94 77 123 6478 =1+1', '-2+3;cmd', '@SUM(A1)', '=1+1', '+1 (555) CALL-NOW']) {
      assert.equal(csvCell(phone, { phone: true }), `"'${phone}"`, phone);
    }
    // ...and anything else is written as it is.
    assert.equal(csvCell('077 123 4567 ext. 2', { phone: true }), '"077 123 4567 ext. 2"');
    // A quote can never reach the ="…" form: the pattern doesn't admit one.
    assert.equal(
      csvCell('+94"),HYPERLINK("http://evil', { phone: true }),
      `"'+94""),HYPERLINK(""http://evil"`
    );
    // The ="…" form is for the phone column only.
    assert.equal(csvCell('+94 77 123 6478'), `"'+94 77 123 6478"`);
  });

  test('the export: BOM, header, and a stranger’s formula arrives as text', async () => {
    await submit({ ...VALID, message: '=HYPERLINK("http://evil.example","Click me")' });
    const res = await admin('GET', '/export.csv');
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type') ?? '', /^text\/csv/);
    assert.match(res.headers.get('content-disposition') ?? '', /^attachment; filename="enquiries-\d{4}-\d{2}-\d{2}\.csv"$/);
    assert.equal(res.headers.get('cache-control'), 'no-store');

    const bytes = new Uint8Array(await res.arrayBuffer());
    assert.deepEqual([...bytes.slice(0, 3)], [0xef, 0xbb, 0xbf]);
    const text = new TextDecoder().decode(bytes).replace(/^﻿/, '');
    const [header, line] = text.split('\r\n');
    assert.match(header, /^"Received","Status","Name","Email","Phone"/);
    assert.ok(line.includes(`"'=HYPERLINK(""http://evil.example"",""Click me"")"`), line);
    assert.ok(line.includes('"=""+94 77 123 6478"""'), line);
  });

  test('inquiriesCsv on no rows is just the header', () => {
    assert.equal(inquiriesCsv([]).split('\r\n').filter(Boolean).length, 1);
  });
});

/* --------------------------------------------------------------- retention */

describe('retention', () => {
  test('closed after 12 months and spam after 30 days are deleted; open enquiries never', async () => {
    await pool.query(`
      insert into public.inquiries (name, email, travelers, dates, status, closed_at, spam, created_at) values
        ('closed-13m',  'a@example.test', '1', 'x', 'closed',    now() - interval '13 months', false, now() - interval '14 months'),
        ('closed-11m',  'b@example.test', '1', 'x', 'closed',    now() - interval '11 months', false, now() - interval '14 months'),
        ('new-2y',      'c@example.test', '1', 'x', 'new',       null,                         false, now() - interval '2 years'),
        ('contacted-2y','d@example.test', '1', 'x', 'contacted', null,                         false, now() - interval '2 years'),
        ('spam-31d',    'e@example.test', '1', 'x', 'new',       null,                         true,  now() - interval '31 days'),
        ('spam-29d',    'f@example.test', '1', 'x', 'new',       null,                         true,  now() - interval '29 days')
    `);
    await pool.query(
      `insert into public.inquiry_attempts (ip, attempted_at) values ('192.0.2.1', now() - interval '25 hours'), ('192.0.2.1', now())`
    );

    const result = await runSweep();
    assert.equal(result.closedInquiries, 1);
    assert.equal(result.spamInquiries, 1);
    assert.equal(result.inquiryAttempts, 1);

    assert.deepEqual(
      (await stored()).map((r) => r.name).sort(),
      ['closed-11m', 'contacted-2y', 'new-2y', 'spam-29d']
    );
  });
});

/* -------------------------------------------------------------------- logs */

describe('no personal data in the logs', () => {
  function captureConsole() {
    const lines: string[] = [];
    const capture = (...args: unknown[]) => {
      lines.push(args.map((a) => (a instanceof Error ? `${a.stack} ${JSON.stringify(a)}` : typeof a === 'string' ? a : JSON.stringify(a))).join(' '));
    };
    const mocks = (['log', 'error', 'warn', 'info'] as const).map((m) => mock.method(console, m, capture));
    return { lines, restore: () => mocks.forEach((m) => m.mock.restore()) };
  }

  const SECRET = {
    name: 'Zyxwq Secretname',
    email: 'zyxwq.secret@example.test',
    message: 'Zyxwq secret message body'
  };

  test('malformed JSON: 400, and the body is not logged', async () => {
    const log = captureConsole();
    try {
      const res = await submit(undefined, { raw: `{"name": "${SECRET.name}", "email": "${SECRET.email}",` });
      assert.equal(res.status, 400);
    } finally {
      log.restore();
    }
    const all = log.lines.join('\n');
    for (const value of Object.values(SECRET).slice(0, 2)) assert.ok(!all.includes(value), `logged: ${value}`);
  });

  test('a database failure on insert is logged by code only, never the row', async () => {
    await pool.query(`
      create or replace function pg_temp_fail_inquiry() returns trigger language plpgsql as $$
      begin
        raise exception 'forced failure for %', new.email
          using detail = 'Failing row contains (' || new.name || ', ' || new.message || ')';
      end $$;
      create trigger test_fail_inquiry before insert on public.inquiries
        for each row execute function pg_temp_fail_inquiry();
    `);
    const log = captureConsole();
    try {
      const res = await submit({ ...VALID, ...SECRET });
      assert.equal(res.status, 500);
      const body = await res.text();
      for (const value of Object.values(SECRET)) assert.ok(!body.includes(value), `response echoed: ${value}`);
    } finally {
      log.restore();
      await pool.query(`
        drop trigger if exists test_fail_inquiry on public.inquiries;
        drop function if exists pg_temp_fail_inquiry();
      `);
    }
    const all = log.lines.join('\n');
    assert.match(all, /database error P0001/);
    for (const value of Object.values(SECRET)) assert.ok(!all.includes(value), `logged: ${value}`);
  });
});

/* ------------------------------------------------------------ notifications */

describe('new-enquiry notifications', () => {
  const settle = (ms: number) => new Promise((r) => setTimeout(r, ms));

  test('at most one email per window, counting what arrived; no enquiry content', async () => {
    const sent: NotificationEmail[] = [];
    const notifier = createNotifier(async (e) => void sent.push(e), { siteUrl: 'https://example.test', windowMs: 300 });
    const local = await listen(createApp({ media: null, notifier }));
    try {
      const post = (body: object) =>
        fetch(`${local.baseUrl}/api/inquiries`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Origin: local.baseUrl, 'X-Forwarded-For': nextIp() },
          body: JSON.stringify(body)
        });
      const people = ['Kasun Alpha', 'Dilini Beta', 'Ruwan Gamma'].map((name, i) => ({
        ...VALID,
        name,
        email: `person${i}@example.test`,
        message: `Private message number ${i}`
      }));

      for (const p of people) assert.equal((await post(p)).status, 201);
      assert.equal((await post({ ...VALID, website: 'bot' })).status, 201);

      await settle(50);
      assert.equal(sent.length, 1, 'the first is sent at once');
      assert.equal(sent[0].subject, `New enquiry on ${BRAND.name}`);

      await settle(400);
      assert.equal(sent.length, 2, 'the rest of the window arrive together');
      assert.equal(sent[1].subject, `2 new enquiries on ${BRAND.name}`);
      assert.match(sent[1].text, /https:\/\/example\.test\/admin\/inquiries/);

      const everything = JSON.stringify(sent);
      for (const p of people) {
        for (const value of [p.name, p.email, p.message, p.phone]) {
          assert.ok(!everything.includes(value), `email contains ${value}`);
        }
      }
    } finally {
      await local.close();
    }
  });

  test('a failing sender never fails the submission, and logs no details', async () => {
    const errors = mock.method(console, 'error', () => undefined);
    const notifier = createNotifier(async () => {
      throw new SendFailed(403);
    }, { siteUrl: null, windowMs: 300 });
    const local = await listen(createApp({ media: null, notifier }));
    try {
      const res = await fetch(`${local.baseUrl}/api/inquiries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: local.baseUrl, 'X-Forwarded-For': nextIp() },
        body: JSON.stringify(VALID)
      });
      assert.equal(res.status, 201);
      await settle(50);
      const logged = errors.mock.calls.map((c) => c.arguments.join(' ')).join('\n');
      assert.match(logged, /403/);
      assert.match(logged, /NOTIFY_EMAIL_TO must be the Resend account/);
      assert.ok(!logged.includes(VALID.email));
    } finally {
      errors.mock.restore();
      await local.close();
    }
  });

  test('the brand at send time: a name saved in Admin → Settings is in the next email', async () => {
    const sent: NotificationEmail[] = [];
    const notifier = createNotifier(async (e) => void sent.push(e), {
      siteUrl: null,
      windowMs: 50,
      brand: async () => resolveBrand({ brand_name: 'Lagoon & Hills' })
    });
    notifier.newInquiry();
    await settle(30);
    assert.equal(sent.length, 1);
    assert.equal(sent[0].subject, 'New enquiry on Lagoon & Hills');
    assert.equal(sent[0].senderName, 'Lagoon & Hills');
    assert.match(sent[0].text, /^Lagoon & Hills has a new enquiry\./);

    // The settings can't be read: the email still goes, with the default brand.
    const fallback: NotificationEmail[] = [];
    createNotifier(async (e) => void fallback.push(e), {
      siteUrl: null,
      brand: async () => {
        throw new Error('database down');
      }
    }).newInquiry();
    await settle(30);
    assert.equal(fallback[0]?.subject, `New enquiry on ${BRAND.name}`);
  });

  test("the sender: the brand's name, and NOTIFY_EMAIL_FROM's address untouched", () => {
    assert.equal(emailSender('onboarding@resend.dev', BRAND), `${BRAND.name} <onboarding@resend.dev>`);
    assert.equal(emailSender('hello@x.example', { name: 'Lagoon & Hills' }), '"Lagoon & Hills" <hello@x.example>');
    // A name already in the variable (the earlier brand's) gives way; the address stays.
    assert.equal(emailSender('Old Name <onboarding@resend.dev>', BRAND), `${BRAND.name} <onboarding@resend.dev>`);
    assert.equal(emailSender('"Q, Ltd" <a@b.example>  ', { name: 'Say "hi"' }), '"Say \\"hi\\"" <a@b.example>');
  });

  test('without a site URL the email names the page instead of linking', () => {
    const email = composeEmail(1, null);
    assert.match(email.text, /Enquiries/);
    assert.ok(!email.text.includes('http'));
  });

  test('config: none set is off quietly; half set is off with a warning', () => {
    const warn = mock.method(console, 'warn', () => undefined);
    try {
      assert.equal(readNotifyConfig({}), null);
      assert.equal(warn.mock.callCount(), 0);
      assert.equal(readNotifyConfig({ RESEND_API_KEY: 're_x' }), null);
      assert.equal(warn.mock.callCount(), 1);

      const on = readNotifyConfig({ RESEND_API_KEY: 're_x', NOTIFY_EMAIL_TO: 'owner@example.test', PUBLIC_SITE_URL: 'https://x.example/' });
      assert.equal(on?.from, 'onboarding@resend.dev', 'a bare address: the brand name goes in front at send time');
      assert.equal(on?.siteUrl, 'https://x.example');
    } finally {
      warn.mock.restore();
    }
  });

  test('the Resend request: bearer key, idempotency key, JSON body; a 403 becomes SendFailed(403)', async () => {
    const seen: Array<{ headers: IncomingMessage['headers']; body: string }> = [];
    let status = 200;
    const server = createServer((req, res) => {
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', () => {
        seen.push({ headers: req.headers, body });
        res.statusCode = status;
        res.setHeader('Content-Type', 'application/json');
        res.end(status === 200 ? '{"id":"test"}' : '{"name":"validation_error"}');
      });
    });
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    const endpoint = `http://127.0.0.1:${(server.address() as AddressInfo).port}/emails`;
    try {
      const send = resendSender(
        { resendApiKey: 're_test_key', to: 'owner@example.test', from: 'onboarding@resend.dev', siteUrl: null },
        endpoint
      );
      await send({ subject: 'S', text: 'T', senderName: BRAND.name });
      assert.equal(seen[0].headers.authorization, 'Bearer re_test_key');
      assert.ok(seen[0].headers['idempotency-key']);
      assert.deepEqual(JSON.parse(seen[0].body), {
        from: `${BRAND.name} <onboarding@resend.dev>`,
        to: 'owner@example.test',
        subject: 'S',
        text: 'T'
      });

      status = 403;
      await assert.rejects(send({ subject: 'S', text: 'T', senderName: BRAND.name }), (e) => e instanceof SendFailed && e.status === 403);
    } finally {
      await new Promise((r) => server.close(r));
    }
  });
});

/* --------------------------------------------------------------- migration */

describe('migration 0006', () => {
  test('the five old statuses map onto the three new ones', async () => {
    // Put the table back into its pre-0006 shape for the length of this test.
    await pool.query(`
      alter table public.inquiries drop constraint inquiries_status_check;
      alter table public.inquiries drop constraint inquiries_closed_at_matches_status;
      insert into public.inquiries (name, email, travelers, dates, status) values
        ('was-new',         'a@example.test', '1', 'x', 'new'),
        ('was-in-progress', 'b@example.test', '1', 'x', 'in_progress'),
        ('was-responded',   'c@example.test', '1', 'x', 'responded'),
        ('was-closed',      'd@example.test', '1', 'x', 'closed'),
        ('was-archived',    'e@example.test', '1', 'x', 'archived');
    `);

    await pool.query(readFileSync(resolve(REPO_ROOT, 'db/migrations/0006_inquiries.sql'), 'utf8'));

    const rows = await stored();
    const byName = Object.fromEntries(rows.map((r) => [r.name, [r.status, r.closed_at !== null]]));
    assert.deepEqual(byName, {
      'was-new': ['new', false],
      'was-in-progress': ['contacted', false],
      'was-responded': ['contacted', false],
      'was-closed': ['closed', true],
      'was-archived': ['closed', true]
    });

    // And the constraints are back.
    await assert.rejects(
      pool.query("update public.inquiries set status = 'archived'"),
      (e: { code?: string }) => e.code === '23514'
    );
  });
});
