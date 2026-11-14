// Must be first: points the server at the test database and removes every
// R2_* and Resend variable, or refuses to run.
import './test-db';

/**
 * `npm run media:rebase` and the image allow-list, for moving R2 to the client's
 * Cloudflare account (docs/runbooks/move-r2-to-client.md), on the test database:
 *
 *   - every URL under the old base moves: the media library (uploads and photo
 *     sets), every image column (destinations, attractions, the journal,
 *     hero slides…) and the photo credits, keyed by URL;
 *   - a dry run reports the same and changes nothing;
 *   - a second run changes nothing (idempotent);
 *   - nothing else changes: Unsplash, other buckets, a look-alike host, a URL
 *     that only mentions the old base, and the text of a setting;
 *   - what still mentions the old base afterwards is reported;
 *   - the CSP and the admin's validation allow the new domain always, and the
 *     old base while R2_PREVIOUS_PUBLIC_BASE_URL is set.
 */
import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, test } from 'node:test';

import { pool } from '../src/db';
import { readPreviousR2Base } from '../src/env';
import { columnsMentioning, missingFiles, rebaseMedia, runRebase, storedImages, urlsUnder } from '../src/media/maintenance';
import { imageOriginsFor } from '../src/media/media';
import { loadPhotoSets } from '../src/media/photo-sets';
import { memoryStore } from '../src/media/store';
import { contentSecurityPolicy } from '../src/security-headers';
import { allowedImageOrigins, isAllowedImageUrl, R2_CUSTOM_DOMAIN_ORIGIN, UNSPLASH_ORIGIN } from '../../shared/image-hosts';
import { assertConnectedToTestDatabase, migrateTestDatabase, resetContent, seedPhotoSet } from './helpers';
import { HOOK_TIMEOUT } from './timeouts';

const OLD = 'https://test-bucket.r2.dev';
const NEW = 'https://images.example.lk';
/** Starts with the old base's text, but is another host: never ours. */
const LOOK_ALIKE = `${OLD}.evil.example/destinations/9-ff.png`;
const OTHER_BUCKET = 'https://other-bucket.r2.dev/library/7-cc.webp';
/** Mentions the old base, but doesn't start with it. */
const MENTIONS_ONLY = `https://web.archive.org/web/2026/${OLD}/library/2-bb.webp`;
const EXPLAINER = `Our photos used to be at ${OLD}/library. Paragraph two.`;

before(async () => {
  migrateTestDatabase();
  await assertConnectedToTestDatabase();
}, HOOK_TIMEOUT);

beforeEach(async () => {
  await resetContent();
  await pool.query('truncate public.media, public.image_credits');
}, HOOK_TIMEOUT);

after(async () => {
  await pool.end();
}, HOOK_TIMEOUT);

/** Uploads, a photo set, and our URLs in every kind of column, next to ones that must not change. */
async function seed(): Promise<void> {
  await pool.query(
    `insert into public.media (key, url, content_type, bytes) values
       ('destinations/1-aa.png', '${OLD}/destinations/1-aa.png', 'image/png', 10),
       ('library/2-bb.webp',     '${OLD}/library/2-bb.webp',     'image/webp', 10),
       ('attractions/3-dd.jpg',  '${OLD}/attractions/3-dd.jpg',  'image/jpeg', 10)`
  );
  await seedPhotoSet('ella', OLD, [480, 768, 1280]);
  await pool.query(
    `update public.destinations
        set image = '${OLD}/destinations/1-aa.png',
            gallery = array['https://images.unsplash.com/keep.jpg', '${OLD}/library/2-bb.webp', '${OTHER_BUCKET}']
      where id = 'ella'`
  );
  await pool.query(`update public.destinations set image = $1 where id = 'kandy'`, [LOOK_ALIKE]);
  await pool.query(`update public.attractions set image = '${OLD}/attractions/3-dd.jpg' where id = 'jungle-beach'`);
  await pool.query(
    `update public.articles set image = '${OLD}/library/2-bb.webp', author_avatar = $1
      where id = (select id from public.articles order by id limit 1)`,
    [MENTIONS_ONLY]
  );
  await pool.query(
    `update public.hero_slides set image = '${OLD}/library/2-bb.webp' where id = (select id from public.hero_slides order by id limit 1)`
  );
  await pool.query(`update public.site_settings set when_to_go_explainer = $1`, [EXPLAINER]);
  await pool.query(
    `insert into public.image_credits (url, author, license) values
       ('${OLD}/destinations/1-aa.png', 'A. Photographer', 'CC BY 4.0'),
       ('${OLD}/library/2-bb.webp',     'B. Photographer', 'CC BY-SA 4.0'),
       ('https://images.unsplash.com/keep.jpg', 'C. Photographer', 'Unsplash'),
       ($1, 'D. Photographer', 'CC0'),
       ($2, 'E. Photographer', 'CC0')`,
    [OTHER_BUCKET, MENTIONS_ONLY]
  );
}

/** Every value a rebase could touch, in a fixed order. */
async function snapshot(): Promise<unknown> {
  const media = await pool.query('select key, url, photo_key, width from public.media order by key');
  const credits = await pool.query('select url, author from public.image_credits order by author');
  const settings = await pool.query('select when_to_go_explainer from public.site_settings');
  // By row only (a stable sort): a gallery keeps its order, which a rebase must keep too.
  const images = (await storedImages(pool)).sort((a, b) =>
    `${a.table}.${a.column}.${a.id}`.localeCompare(`${b.table}.${b.column}.${b.id}`)
  );
  return { media: media.rows, credits: credits.rows, settings: settings.rows, images };
}

async function rebase(options: { dryRun: boolean }) {
  const client = await pool.connect();
  try {
    return await runRebase(client, OLD, NEW, options);
  } finally {
    client.release();
  }
}

/** What the old snapshot becomes when exactly the URLs that start with OLD + "/" move to NEW. */
function moved(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value), (_key, v) =>
    typeof v === 'string' && v.startsWith(`${OLD}/`) ? NEW + v.slice(OLD.length) : v
  );
}

describe('media:rebase', () => {
  test('moves the library, the photo sets, every image column and the credits, and nothing else', async () => {
    await seed();
    const before = await snapshot();

    const result = await rebase({ dryRun: false });
    assert.equal(result.committed, true);
    assert.equal(result.media, 6, 'three uploads and three widths of a photo set');
    assert.equal(result.columns['destinations.image'], 1);
    assert.equal(result.columns['destinations.gallery'], 1);
    assert.equal(result.columns['attractions.image'], 1);
    assert.equal(result.columns['articles.image'], 1);
    assert.equal(result.columns['articles.author_avatar'], 0, 'only mentions the old base');
    assert.equal(result.columns['hero_slides.image'], 1);
    assert.equal(result.credits, 2);
    assert.equal(result.creditsAlreadyMoved, 0);

    // Exactly the values that started with the old base changed; everything else is as it was.
    assert.deepEqual(await snapshot(), moved(before));

    const kandy = await pool.query(`select image from public.destinations where id = 'kandy'`);
    assert.equal(kandy.rows[0].image, LOOK_ALIKE, 'a look-alike host is not ours');
    const credits = await pool.query('select url from public.image_credits order by author');
    assert.deepEqual(credits.rows.map((r) => r.url), [
      `${NEW}/destinations/1-aa.png`,
      `${NEW}/library/2-bb.webp`,
      'https://images.unsplash.com/keep.jpg',
      OTHER_BUCKET,
      MENTIONS_ONLY
    ]);
    const sets = await loadPhotoSets(pool);
    assert.deepEqual(sets.ella.map((v) => v.width), [480, 768, 1280]);
    assert.ok(sets.ella.every((v) => v.url.startsWith(`${NEW}/assets/`)), 'the photo set moved');

    // Reported, never changed: what only mentions the old base.
    assert.deepEqual(result.leftover, {
      'articles.author_avatar': 1,
      'image_credits.url': 1,
      'site_settings.when_to_go_explainer': 1,
      // The look-alike host's URL contains the old base's text too.
      'destinations.image': 1
    });
    const settings = await pool.query('select when_to_go_explainer from public.site_settings');
    assert.equal(settings.rows[0].when_to_go_explainer, EXPLAINER);
  });

  test('a dry run reports the same counts and changes nothing', async () => {
    await seed();
    const before = await snapshot();
    const dry = await rebase({ dryRun: true });
    assert.equal(dry.committed, false);
    assert.deepEqual(await snapshot(), before, 'nothing changed');

    const real = await rebase({ dryRun: false });
    const { committed: _a, ...dryCounts } = dry;
    const { committed: _b, ...realCounts } = real;
    assert.deepEqual(dryCounts, realCounts, 'the dry run predicted the real one');
  });

  test('safe to run twice: the second run changes nothing', async () => {
    await seed();
    await rebase({ dryRun: false });
    const once = await snapshot();
    const updatedAt = await pool.query(`select updated_at from public.destinations where id = 'ella'`);

    const again = await rebase({ dryRun: false });
    assert.equal(again.media, 0);
    assert.equal(again.credits, 0);
    assert.deepEqual(Object.values(again.columns).filter((n) => n > 0), []);
    assert.deepEqual(await snapshot(), once);
    const stillAt = await pool.query(`select updated_at from public.destinations where id = 'ella'`);
    assert.deepEqual(stillAt.rows, updatedAt.rows, 'not even updated_at moves');
  });

  test('a credit already on the new base wins; the old one is left and counted', async () => {
    await seed();
    await pool.query(
      `insert into public.image_credits (url, author, license) values ('${NEW}/library/2-bb.webp', 'Credited again', 'CC BY 4.0')`
    );
    const result = await rebase({ dryRun: false });
    assert.equal(result.credits, 1);
    assert.equal(result.creditsAlreadyMoved, 1);
    const { rows } = await pool.query(`select author from public.image_credits where url = '${NEW}/library/2-bb.webp'`);
    assert.deepEqual(rows, [{ author: 'Credited again' }]);
  });

  test('a failure rolls the whole rebase back', async () => {
    await seed();
    const before = await snapshot();
    // Someone else's row already has the URL one of ours would move to: media.url is unique.
    await pool.query(
      `insert into public.media (key, url, content_type, bytes) values ('library/5-ee.webp', '${NEW}/destinations/1-aa.png', 'image/webp', 10)`
    );
    const client = await pool.connect();
    try {
      await assert.rejects(runRebase(client, OLD, NEW, { dryRun: false }), /unique|duplicate/i);
    } finally {
      client.release();
    }
    await pool.query(`delete from public.media where key = 'library/5-ee.webp'`);
    assert.deepEqual(await snapshot(), before);
  });

  test('bad bases are refused', async () => {
    const client = await pool.connect();
    try {
      await client.query('begin');
      await assert.rejects(rebaseMedia(client, 'http://insecure.example', NEW), /https/);
      await assert.rejects(rebaseMedia(client, OLD, `${OLD}/`), /same/);
      await client.query('rollback');
    } finally {
      client.release();
    }
  });

  test('--verify-files: every file the database uses, and only those answering 200 with an image pass', async () => {
    await seed();
    const urls = await urlsUnder(pool, OLD);
    assert.deepEqual(urls, [...new Set(urls)].sort(), 'sorted, each once');
    assert.equal(urls.length, 6, 'three uploads and three photo-set widths');
    assert.ok(urls.includes(`${OLD}/destinations/1-aa.png`) && urls.includes(`${OLD}/attractions/3-dd.jpg`));
    assert.ok(urls.every((u) => u.startsWith(`${OLD}/`)));
    assert.ok(!urls.includes(LOOK_ALIKE) && !urls.includes(MENTIONS_ONLY) && !urls.includes(OTHER_BUCKET));

    const onNew = urls.map((u) => NEW + u.slice(OLD.length));
    const answers = new Map<string, { status: number; contentType: string | null }>(onNew.map((u) => [u, { status: 200, contentType: 'image/webp' }]));
    answers.set(onNew[0], { status: 404, contentType: 'text/html' });
    answers.set(onNew[1], { status: 200, contentType: 'application/xml' });
    const missing = await missingFiles(onNew, async (u) => answers.get(u)!);
    assert.deepEqual(missing, [
      { url: onNew[0], problem: 'HTTP 404' },
      { url: onNew[1], problem: 'Content-Type application/xml' }
    ]);
    assert.deepEqual(await missingFiles(onNew.slice(2), async (u) => answers.get(u)!), []);
    assert.deepEqual(await missingFiles([]), []);
  });

  test('columnsMentioning finds text in any table, and only counts it', async () => {
    await seed();
    const found = await columnsMentioning(pool, OLD);
    assert.equal(found['media.url'], 6);
    assert.equal(found['image_credits.url'], 3);
    assert.equal(found['site_settings.when_to_go_explainer'], 1);
    assert.deepEqual(await columnsMentioning(pool, 'https://nowhere.example'), {});
  });
});

describe('the image allow-list during the move', () => {
  const media = (previousBaseUrl: string | null) => ({ store: memoryStore(), publicBaseUrl: NEW, previousBaseUrl });

  test("the client's custom domain is always allowed", () => {
    assert.equal(R2_CUSTOM_DOMAIN_ORIGIN, 'https://images.serendibluxetours.com');
    assert.deepEqual(allowedImageOrigins(null), [UNSPLASH_ORIGIN, R2_CUSTOM_DOMAIN_ORIGIN]);
    const imgSrc = contentSecurityPolicy(null).split('; ').find((d) => d.startsWith('img-src '))!.split(' ');
    assert.ok(imgSrc.includes(R2_CUSTOM_DOMAIN_ORIGIN));
  });

  test('the old base is allowed while R2_PREVIOUS_PUBLIC_BASE_URL is set, and only then', () => {
    const during = imageOriginsFor(media(OLD));
    assert.deepEqual(during, [UNSPLASH_ORIGIN, R2_CUSTOM_DOMAIN_ORIGIN, NEW, OLD]);
    assert.ok(isAllowedImageUrl(`${OLD}/library/2-bb.webp`, during));
    assert.ok(isAllowedImageUrl(`${NEW}/library/2-bb.webp`, during));
    assert.ok(!isAllowedImageUrl(LOOK_ALIKE, during));
    assert.ok(contentSecurityPolicy(media(OLD)).includes(` ${OLD} `));

    const afterwards = imageOriginsFor(media(null));
    assert.ok(!isAllowedImageUrl(`${OLD}/library/2-bb.webp`, afterwards));
    assert.ok(!contentSecurityPolicy(media(null)).includes(OLD));
  });

  test('R2_PREVIOUS_PUBLIC_BASE_URL: https only, trailing slash dropped', () => {
    assert.equal(readPreviousR2Base({}), null);
    assert.equal(readPreviousR2Base({ R2_PREVIOUS_PUBLIC_BASE_URL: '  ' }), null);
    assert.equal(readPreviousR2Base({ R2_PREVIOUS_PUBLIC_BASE_URL: `${OLD}/` }), OLD);
    assert.equal(readPreviousR2Base({ R2_PREVIOUS_PUBLIC_BASE_URL: 'http://test-bucket.r2.dev' }), null);
  });
});
