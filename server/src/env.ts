/**
 * Validated configuration, resolved once at boot.
 *
 * Fails fast and loudly: a service that starts with a missing DATABASE_URL and
 * then 500s on every request is far harder to diagnose than one that refuses to
 * start and says which variable is wrong.
 */
import '../../shared/load-env';

import { z } from 'zod';

const schema = z.object({
  /**
   * Deployed: set this as a Railway variable *reference* to the Postgres
   * service's own DATABASE_URL, so it resolves to the internal
   * `*.railway.internal` host and database traffic stays on the private
   * network. Local: the public proxy URL from `.env`.
   */
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  /**
   * Railway injects PORT, so this default only applies locally. 8081 rather
   * than 8080 because 8080 is a common default for a local Apache/XAMPP
   * install. Must match the Vite dev proxy target in vite.config.ts.
   */
  PORT: z.coerce.number().int().positive().default(8081),

  NODE_ENV: z.enum(['development', 'production', 'test']).default('development')
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment:\n');
  for (const issue of parsed.error.issues) {
    console.error(`  ${issue.path.join('.') || '(root)'}: ${issue.message}`);
  }
  console.error(
    '\nLocal runs read .env from the project root. On Railway these come from\n' +
      "the service's Variables tab."
  );
  process.exit(1);
}

export const env = parsed.data;

export const isProduction = env.NODE_ENV === 'production';
