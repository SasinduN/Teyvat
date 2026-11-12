/**
 * Booking status emails: an outbox (`booking_notifications`), filled in the
 * same transaction as the status change and sent through Resend, as the
 * enquiry emails are. A failure is retried 15 minutes later by the next send
 * or the hourly sweep, at most five times. `sent` means Resend accepted it.
 *
 * The email holds the reference and the status only: no pickup, stops or
 * coordinates. Nothing about the request reaches the logs.
 */
import { emailSender } from '../../../shared/brand';
import { loadBrand } from '../brand';
import { pool } from '../db';
import { notifyConfig, type NotifyConfig } from '../env';
import { RESEND_EMAILS_ENDPOINT } from '../inquiries/notify';

let running = false;

export async function dispatchBookingNotifications(
  config: NotifyConfig | null = notifyConfig,
  send: typeof fetch = fetch
): Promise<void> {
  if (!config || running) return;
  running = true;
  const client = await pool.connect().catch(() => null);
  if (!client) {
    running = false;
    return;
  }
  try {
    const brand = await loadBrand(client);
    await client.query('begin');
    const { rows } = await client.query<{ id: string; event: string; reference: string; email: string }>(
      `select n.id, n.event, b.reference, b.details->>'contactEmail' as email
         from public.booking_notifications n join public.bookings b on b.id = n.booking_id
        where n.status <> 'sent' and n.attempts < 5 and n.next_attempt_at <= now()
        order by n.created_at limit 10
        for update of n skip locked`
    );
    for (const n of rows) {
      const status = n.event.split(':')[1];
      let sent = false;
      try {
        const response = await send(RESEND_EMAILS_ENDPOINT, {
          method: 'POST',
          headers: { Authorization: `Bearer ${config.resendApiKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': n.id },
          body: JSON.stringify({
            from: emailSender(config.from, brand),
            to: [...new Set([n.email, config.to].filter(Boolean))],
            subject: `${brand.name} booking ${status}`,
            text:
              `Booking reference: ${n.reference}\nStatus: ${status}\n` +
              'A pending request is not a confirmed reservation. Open the booking page in the browser you used to send the request to see its current status.'
          }),
          signal: AbortSignal.timeout(10_000)
        });
        sent = response.ok;
      } catch {
        // Recorded below, and retried.
      }
      await client.query(
        "update public.booking_notifications set status = $2, attempts = attempts + 1, next_attempt_at = now() + interval '15 minutes' where id = $1",
        [n.id, sent ? 'sent' : 'failed']
      );
      if (!sent) console.error('[booking-notify] delivery failed; it will be retried.');
    }
    await client.query('commit');
  } catch {
    await client.query('rollback').catch(() => undefined);
    console.error('[booking-notify] the outbox is unavailable.');
  } finally {
    client.release();
    running = false;
  }
}
