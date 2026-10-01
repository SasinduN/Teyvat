/**
 * Zod, configured for the browser's Content-Security-Policy. Import `z` from
 * here, not from 'zod', in anything the admin panel loads.
 *
 * Zod 4 compiles fast object validators with `new Function`, and checks
 * whether it may by calling `new Function` once when an object schema is
 * created. Under `script-src 'self'` that check is blocked and reported as a
 * CSP violation on every admin page (Zod falls back and works either way).
 * `jitless` skips both the check and the compiler. It has to be set before
 * any schema is created, which importing `z` from this module guarantees.
 */
import { z } from 'zod';

z.config({ jitless: true });

export { z };
