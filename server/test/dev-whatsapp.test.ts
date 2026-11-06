// Must be first: points the server at the test database, or refuses to run.
import './test-db';

/**
 * The fake WhatsApp number stays in local and test data. Migrations run on production,
 * where the number is what the admin set; the app's own code must never carry one either.
 */
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { after, test } from 'node:test';

import { DEV_WHATSAPP_NUMBER } from '../../scripts/fixtures/dev-whatsapp';
import { whatsappUrl } from '../../shared/whatsapp';
import { pool } from '../src/db';
import { assertConnectedToTestDatabase, migrateTestDatabase, resetContent } from './helpers';
import { HOOK_TIMEOUT } from './timeouts';

const ROOT = resolve(import.meta.dirname, '..', '..');

const files = (dir: string): string[] =>
  readdirSync(join(ROOT, dir)).flatMap((name) => {
    const path = join(dir, name);
    return statSync(join(ROOT, path)).isDirectory() ? files(path) : [path];
  });

after(async () => {
  await pool.end();
}, HOOK_TIMEOUT);

test('the fake number is in no migration and none of the shipped code', () => {
  const found = ['db/migrations', 'src', 'shared', 'server/src', 'public']
    .flatMap(files)
    .filter((file) => /\.(sql|tsx?|css|html|js|json|txt)$/.test(file))
    .filter((file) => readFileSync(join(ROOT, file), 'utf8').includes(DEV_WHATSAPP_NUMBER));
  assert.deepEqual(found, []);
});

test('after every migration the number is empty; only the test data sets it', HOOK_TIMEOUT, async () => {
  migrateTestDatabase();
  await assertConnectedToTestDatabase();
  const number = async () => (await pool.query<{ whatsapp_number: string | null }>('select whatsapp_number from public.site_settings where id')).rows[0].whatsapp_number;
  assert.equal(await number(), null, 'the migrations set no number');
  await resetContent();
  assert.equal(await number(), DEV_WHATSAPP_NUMBER, 'the test data does');
  await resetContent({ whatsappNumber: null });
  assert.equal(await number(), null, 'and a test can ask for none');
});

test("the link's format, which is all a test may do with it", () => {
  assert.equal(whatsappUrl(DEV_WHATSAPP_NUMBER), 'https://wa.me/94771236478');
});
