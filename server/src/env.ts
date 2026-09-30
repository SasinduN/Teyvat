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

/* ------------------------------------------------------------------ R2 */

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  /** `https://…` with no trailing slash. Object URLs are `${publicBaseUrl}/${key}`. */
  publicBaseUrl: string;
}

const R2_VARIABLES = [
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET',
  'R2_PUBLIC_BASE_URL'
] as const;

/** Trailing slashes off, so `https://x.r2.dev` and `https://x.r2.dev/` agree. */
export function normaliseBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

/**
 * Image uploads are optional. All five variables set: uploads on. None set:
 * off, quietly. Some set, or a base URL that isn't https: off, with one
 * warning naming the problem. Never an exit: a typo in an image setting must
 * not take the whole site down with it.
 */
export function readR2Config(source: NodeJS.ProcessEnv): R2Config | null {
  const values = R2_VARIABLES.map((name) => source[name]?.trim() ?? '');
  const missing = R2_VARIABLES.filter((_, i) => !values[i]);

  if (missing.length === R2_VARIABLES.length) return null;

  if (missing.length > 0) {
    console.warn(
      `[media] image uploads are off: ${missing.join(', ')} ${missing.length === 1 ? 'is' : 'are'} not set.`
    );
    return null;
  }

  const [accountId, accessKeyId, secretAccessKey, bucket, rawBase] = values;
  const publicBaseUrl = normaliseBaseUrl(rawBase);
  if (!/^https:\/\/[^\s/]+/.test(publicBaseUrl)) {
    console.warn('[media] image uploads are off: R2_PUBLIC_BASE_URL must start with https://.');
    return null;
  }

  return { accountId, accessKeyId, secretAccessKey, bucket, publicBaseUrl };
}

export const r2Config = readR2Config(process.env);

/* ------------------------------------------------------------ notifications */

export interface NotifyConfig {
  resendApiKey: string;
  to: string;
  from: string;
  /** For the link in the email. Optional: without it the email just names the page. */
  siteUrl: string | null;
}

/**
 * Resend's test sender. Until a domain is verified, Resend only delivers mail
 * from it to the address the Resend account was created with.
 */
export const RESEND_TEST_SENDER = 'Travel Eye <onboarding@resend.dev>';

/**
 * New-enquiry emails are optional, like image uploads. RESEND_API_KEY and
 * NOTIFY_EMAIL_TO together turn them on; one without the other turns them off
 * with a warning. NOTIFY_EMAIL_FROM defaults to Resend's test sender.
 */
export function readNotifyConfig(source: NodeJS.ProcessEnv): NotifyConfig | null {
  const resendApiKey = source.RESEND_API_KEY?.trim() ?? '';
  const to = source.NOTIFY_EMAIL_TO?.trim() ?? '';

  if (!resendApiKey && !to) return null;
  if (!resendApiKey || !to) {
    console.warn(
      `[notify] new-enquiry emails are off: ${!resendApiKey ? 'RESEND_API_KEY' : 'NOTIFY_EMAIL_TO'} is not set.`
    );
    return null;
  }

  const rawSite = source.PUBLIC_SITE_URL?.trim() ?? '';
  const siteUrl = /^https:\/\/[^\s/]+/.test(rawSite) ? normaliseBaseUrl(rawSite) : null;

  return {
    resendApiKey,
    to,
    from: source.NOTIFY_EMAIL_FROM?.trim() || RESEND_TEST_SENDER,
    siteUrl
  };
}

export const notifyConfig = readNotifyConfig(process.env);
