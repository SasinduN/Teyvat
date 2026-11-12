/**
 * "You have a new enquiry" emails, through Resend's HTTP API.
 *
 * - The email carries no enquiry content: no name, email or message. It says
 *   how many arrived and where to read them. Personal data isn't copied to an
 *   email provider or left sitting in inboxes.
 * - At most one email per window (15 minutes). The first enquiry after a
 *   quiet spell is sent at once; the rest of the window's are counted and
 *   sent together when it ends, so a spam wave can't flood the admin.
 * - Spam never triggers one.
 * - A failed send is logged by status only and never affects the visitor.
 *
 * Per process: with several replicas each keeps its own window. That's fine
 * at this scale; it only means one email per replica per window at worst.
 */
import { randomUUID } from 'node:crypto';

import { BRAND, emailSender, type Brand } from '../../../shared/brand';
import type { NotifyConfig } from '../env';

export interface NotificationEmail {
  subject: string;
  text: string;
  /** The brand's name, for the From line (`emailSender`). */
  senderName: string;
}

export type SendEmail = (email: NotificationEmail) => Promise<void>;

export interface Notifier {
  /** Called once per stored, non-spam enquiry. Returns at once. */
  newInquiry(): void;
}

export const OFF: Notifier = { newInquiry: () => undefined };

export const NOTIFY_WINDOW_MS = 15 * 60 * 1000;

export function composeEmail(count: number, siteUrl: string | null, brand: Pick<Brand, 'name'> = BRAND): NotificationEmail {
  const what = count === 1 ? 'a new enquiry' : `${count} new enquiries`;
  const where = siteUrl
    ? `Read ${count === 1 ? 'it' : 'them'} here: ${siteUrl}/admin/inquiries`
    : 'Open the admin panel and go to Enquiries to read it.';
  return {
    subject: count === 1 ? `New enquiry on ${brand.name}` : `${count} new enquiries on ${brand.name}`,
    senderName: brand.name,
    text:
      `${brand.name} has ${what}.\n\n${where}\n\n` +
      'This email leaves out the enquiry itself on purpose, so no traveller details ' +
      'are copied into email.'
  };
}

export class SendFailed extends Error {
  constructor(readonly status: number) {
    super(`email provider answered ${status}`);
  }
}

export const RESEND_EMAILS_ENDPOINT = 'https://api.resend.com/emails';

/**
 * Resend's `POST /emails`. Throws `SendFailed` on a non-2xx. The endpoint is
 * a parameter only so tests can point it at a local stand-in.
 */
export function resendSender(config: NotifyConfig, endpoint = RESEND_EMAILS_ENDPOINT): SendEmail {
  return async ({ subject, text, senderName }) => {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.resendApiKey}`,
        'Content-Type': 'application/json',
        // A retry inside Resend's 24 h window can't send the same email twice.
        'Idempotency-Key': randomUUID()
      },
      body: JSON.stringify({ from: emailSender(config.from, { name: senderName }), to: config.to, subject, text }),
      signal: AbortSignal.timeout(10_000)
    });
    if (!res.ok) throw new SendFailed(res.status);
  };
}

export function createNotifier(
  send: SendEmail,
  options: {
    siteUrl: string | null;
    windowMs?: number;
    /** The brand at send time (`loadBrand`), so a renamed site's next email says so. */
    brand?: () => Promise<Brand>;
  }
): Notifier {
  const brandNow = options.brand ?? (async () => BRAND);
  const windowMs = options.windowMs ?? NOTIFY_WINDOW_MS;
  let lastSentAt = -Infinity;
  let pending = 0;
  let timer: NodeJS.Timeout | null = null;

  const flush = () => {
    timer = null;
    if (pending === 0) return;
    const count = pending;
    pending = 0;
    lastSentAt = Date.now();

    brandNow()
      .catch(() => BRAND)
      .then((brand) => send(composeEmail(count, options.siteUrl, brand)))
      .catch((error: unknown) => {
      if (error instanceof SendFailed && error.status === 403) {
        console.error(
          '[notify] Resend refused the recipient (403). With the test sender, ' +
            'NOTIFY_EMAIL_TO must be the Resend account’s own address.'
        );
      } else if (error instanceof SendFailed) {
        console.error(`[notify] new-enquiry email failed: Resend answered ${error.status}.`);
      } else {
        console.error(`[notify] new-enquiry email failed: ${(error as Error).name}.`);
      }
    });
  };

  return {
    newInquiry() {
      pending += 1;
      if (timer) return;
      const wait = lastSentAt + windowMs - Date.now();
      if (wait <= 0) flush();
      else timer = setTimeout(flush, wait).unref();
    }
  };
}
