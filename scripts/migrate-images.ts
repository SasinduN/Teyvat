/**
 * OPTIONAL one-off: move every remote (Unsplash) image referenced by seeded
 * content into the Supabase Storage `media` bucket, then rewrite the rows to
 * point at the new public URLs.
 *
 * After this runs, no content row references a third-party image host.
 *
 *   # PowerShell
 *   $env:SUPABASE_URL="https://xxxx.supabase.co"
 *   $env:SUPABASE_SECRET_KEY="sb_secret_..."
 *   npm run images:migrate
 *
 *   # bash
 *   SUPABASE_URL=... SUPABASE_SECRET_KEY=... npm run images:migrate
 *
 * The secret key (`sb_secret_...`, Project Settings → API Keys) is read from the
 * shell only — it must never live in `.env.local` behind a VITE_ prefix, and
 * never be imported from `src/`. Legacy `service_role` JWTs are deprecated.
 *
 * Safe to re-run: URLs already inside the bucket are skipped. Pass --dry-run to
 * preview without writing anything.
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SECRET_KEY;
const DRY_RUN = process.argv.includes('--dry-run');

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    'Missing SUPABASE_URL and/or SUPABASE_SECRET_KEY in the environment.\n' +
      'See the comment at the top of this file.'
  );
  process.exit(1);
}

const BUCKET = 'media';
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false }
});

/** Which columns on which tables hold images. `array: true` = text[] gallery. */
const IMAGE_COLUMNS: { table: string; column: string; array?: boolean; folder: string }[] = [
  { table: 'destinations', column: 'image', folder: 'destinations' },
  { table: 'destinations', column: 'gallery', array: true, folder: 'destinations' },
  { table: 'experience_categories', column: 'image', folder: 'experiences' },
  { table: 'featured_experiences', column: 'image', folder: 'experiences' },
  { table: 'tours', column: 'image', folder: 'tours' },
  { table: 'articles', column: 'image', folder: 'journal' },
  { table: 'articles', column: 'author_avatar', folder: 'authors' },
  { table: 'hidden_gems', column: 'image', folder: 'hidden-gems' },
  { table: 'photo_stories', column: 'image', folder: 'photo-stories' }
];

const EXT_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/gif': 'gif'
};

const publicPrefix = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/`;

const alreadyMigrated = (url: string): boolean => url.startsWith(publicPrefix);

/** Remote URL -> storage object path. Cached so shared images upload once. */
const cache = new Map<string, string>();

async function migrateUrl(url: string, folder: string, hint: string): Promise<string> {
  if (!url || alreadyMigrated(url)) return url;

  const cached = cache.get(url);
  if (cached) return cached;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`download failed (${res.status} ${res.statusText})`);
  }

  const contentType = (res.headers.get('content-type') ?? 'image/jpeg').split(';')[0].trim();
  const ext = EXT_BY_TYPE[contentType] ?? 'jpg';
  const bytes = new Uint8Array(await res.arrayBuffer());

  const unique = Math.random().toString(36).slice(2, 8);
  const path = `${folder}/${hint}-${unique}.${ext}`;

  if (DRY_RUN) {
    console.log(`      would upload -> ${path} (${(bytes.length / 1024).toFixed(0)} KB)`);
    cache.set(url, url);
    return url;
  }

  const { error } = await supabase.storage.from(BUCKET).upload(path, bytes, {
    contentType,
    cacheControl: '31536000',
    upsert: false
  });
  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  cache.set(url, data.publicUrl);
  return data.publicUrl;
}

async function run(): Promise<void> {
  console.log(DRY_RUN ? '— DRY RUN, nothing will be written —\n' : '');

  let moved = 0;
  let skipped = 0;
  let failed = 0;

  for (const spec of IMAGE_COLUMNS) {
    const { data, error } = await supabase.from(spec.table).select(`id, ${spec.column}`);
    if (error) {
      console.error(`${spec.table}.${spec.column}: ${error.message}`);
      failed += 1;
      continue;
    }

    console.log(`${spec.table}.${spec.column}  (${data?.length ?? 0} rows)`);

    for (const row of (data ?? []) as unknown as Record<string, unknown>[]) {
      const id = String(row.id);
      const current = row[spec.column];

      try {
        if (spec.array) {
          const urls = Array.isArray(current) ? (current as string[]) : [];
          if (urls.length === 0 || urls.every(alreadyMigrated)) {
            skipped += urls.length;
            continue;
          }

          const next: string[] = [];
          for (const [i, url] of urls.entries()) {
            next.push(await migrateUrl(url, spec.folder, `${id}-${i}`));
          }

          if (!DRY_RUN) {
            const { error: upErr } = await supabase
              .from(spec.table)
              .update({ [spec.column]: next })
              .eq('id', id);
            if (upErr) throw upErr;
          }

          moved += next.length;
          console.log(`   ${id}: ${next.length} gallery image(s)`);
        } else {
          const url = typeof current === 'string' ? current : '';
          if (!url || alreadyMigrated(url)) {
            skipped += 1;
            continue;
          }

          const next = await migrateUrl(url, spec.folder, id);

          if (!DRY_RUN) {
            const { error: upErr } = await supabase
              .from(spec.table)
              .update({ [spec.column]: next })
              .eq('id', id);
            if (upErr) throw upErr;
          }

          moved += 1;
          console.log(`   ${id}: ok`);
        }
      } catch (e) {
        failed += 1;
        console.error(`   ${id}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }

  console.log(`\nDone. migrated ${moved}, already local ${skipped}, failed ${failed}.`);
  if (failed > 0) process.exitCode = 1;
}

void run();
