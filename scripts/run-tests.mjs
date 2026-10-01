/**
 * `npm test`: every `server/test/*.test.ts`, one file at a time, each in its
 * own process.
 *
 * Why not just `node --test --test-timeout=…` over the glob: with Node's
 * default process isolation the parent runner applies the timeout to each
 * *file* as well, and it fires first, so a hang is reported as the file's
 * path rather than the test that hung. Running a file with
 * `--experimental-test-isolation=none` puts its tests in that process, where
 * the timeout belongs to each test and a hang fails with the test's name.
 * One file per process keeps what isolation gave us: the files share a
 * database pool and module state, and each ends its own pool.
 *
 * Limits, so nothing can block the run:
 *   60 s     per test                    (--test-timeout)
 *   120 s    per hook                    (HOOK_TIMEOUT in server/test/timeouts.ts;
 *                                          Node doesn't apply --test-timeout to hooks)
 *   10 min   per file, as a last resort  (killed here, named by file)
 * `--test-force-exit` ends a file once its tests are done, even if a hung
 * test left a timer or socket open.
 */
import { spawn } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TEST_DIR = join(ROOT, 'server', 'test');
const PER_TEST_MS = 60_000;
const PER_FILE_MS = 10 * 60_000;

const only = process.argv.slice(2);
const files = readdirSync(TEST_DIR)
  .filter((f) => f.endsWith('.test.ts'))
  .filter((f) => only.length === 0 || only.some((o) => f.includes(o)))
  .sort()
  .map((f) => join(TEST_DIR, f));

function runFile(file) {
  return new Promise((resolveRun) => {
    const child = spawn(
      process.execPath,
      [
        '--import',
        'tsx',
        '--test',
        '--experimental-test-isolation=none',
        `--test-timeout=${PER_TEST_MS}`,
        '--test-force-exit',
        '--test-reporter=spec',
        file
      ],
      { cwd: ROOT, stdio: 'inherit' }
    );

    const watchdog = setTimeout(() => {
      console.error(`\n✖ ${relative(ROOT, file)} ran past ${PER_FILE_MS / 60_000} minutes; stopped.`);
      child.kill();
    }, PER_FILE_MS);

    child.on('exit', (code, signal) => {
      clearTimeout(watchdog);
      resolveRun(code === 0 && !signal);
    });
  });
}

const failed = [];
for (const file of files) {
  console.log(`\n▶▶ ${relative(ROOT, file)}`);
  if (!(await runFile(file))) failed.push(relative(ROOT, file));
}

console.log(`\n${files.length - failed.length}/${files.length} test files passed.`);
if (failed.length > 0) {
  console.error(`Failed: ${failed.join(', ')}`);
  process.exit(1);
}
