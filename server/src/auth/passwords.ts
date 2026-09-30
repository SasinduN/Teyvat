/**
 * Password hashing: argon2id through `@node-rs/argon2`.
 *
 * The cost settings are OWASP's minimum for argon2id (19 MiB, two passes, one
 * lane). They are written into every PHC string, so they can be raised later
 * without invalidating the hashes already stored — verify reads them back out
 * of the hash rather than from here.
 *
 * Hashing runs on libuv's worker pool (four threads unless UV_THREADPOOL_SIZE
 * says otherwise), not on the event loop. That also caps how much memory
 * concurrent sign-ins can claim at about 4 × 19 MiB.
 */
import { randomBytes } from 'node:crypto';

import { hash, verify, type Algorithm, type Options } from '@node-rs/argon2';

/**
 * `Algorithm` is a `const enum` in the package's typings, which
 * `isolatedModules` cannot inline. 2 is `Algorithm.Argon2id`; the `$argon2id$`
 * CHECK on `users.password_hash` catches it if that ever stops being true.
 */
const ARGON2ID = 2 as Algorithm;

const OPTIONS: Options = {
  algorithm: ARGON2ID,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1
};

async function hashPassword(password: string): Promise<string> {
  return hash(password, OPTIONS);
}

/** False for a wrong password and for a hash that cannot be parsed. */
async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}

/**
 * Called as `passwords.verify(...)`, never destructured, so the tests can wrap
 * `verify` with `mock.method` and count how many times sign-in ran it.
 */
export const passwords = {
  hash: hashPassword,
  verify: verifyPassword
};

/**
 * A hash of random bytes nobody knows, made once at boot with the same cost
 * settings as a real one. Sign-in verifies against it when the email is not
 * a user, so an unknown email costs the same argon2 work as a wrong password
 * and the response time does not say which it was.
 */
const dummyHash = hashPassword(randomBytes(32).toString('base64url'));

export function getDummyHash(): Promise<string> {
  return dummyHash;
}
