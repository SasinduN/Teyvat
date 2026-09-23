/**
 * Loads `.env` for everything that runs under Node: the migration runner now,
 * and `server/src/env.ts` from phase 2a. One definition, so the two can never
 * disagree about which file is authoritative.
 *
 * Import it for side effects, first, before anything reads `process.env`:
 *
 *     import '../shared/load-env';
 *
 * ---------------------------------------------------------------------------
 * Why dotenv rather than `node --env-file`
 * ---------------------------------------------------------------------------
 * Node 22 could do this natively, but `--env-file` is a hard error when the
 * file is absent — which is the normal case on Railway, where variables are
 * injected by the platform and no `.env` exists. That would make the start
 * command fail in production and only in production. `--env-file-if-exists`
 * fixes that but has to be threaded through every `tsx` invocation in
 * package.json, and is silently a no-op on older Node.
 *
 * dotenv no-ops on a missing file, which is exactly the dev/prod split we
 * want, and it never overwrites a variable that is already set — so Railway's
 * injected DATABASE_URL always wins over a stray file in the image.
 * ---------------------------------------------------------------------------
 */
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * `.env.local` first, then `.env` — the same precedence Vite applies to the
 * client, so there is one rule to remember for the whole repo. dotenv does not
 * overwrite keys it has already seen, so the earlier file wins per-key.
 *
 * Which to use:
 *   .env        committed-shaped but gitignored; your own DATABASE_URL etc.
 *   .env.local  personal overrides on top of it
 * Both are gitignored. `.env.example` is the only one in version control.
 */
config({
  path: [resolve(PROJECT_ROOT, '.env.local'), resolve(PROJECT_ROOT, '.env')]
});
