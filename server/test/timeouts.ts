/**
 * Time limits, so a hang fails with a name instead of blocking the run.
 *
 * `npm test` (scripts/run-tests.mjs) gives every test 60 s through
 * `--test-timeout`. Node doesn't apply that to hooks, so each `before`,
 * `beforeEach`, `after` and `afterEach` passes this as its options: a hook
 * that hangs (Chrome not starting, a database lock) fails its suite by name.
 */
export const HOOK_TIMEOUT = { timeout: 120_000 };
