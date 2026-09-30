/**
 * Creating admins and resetting their passwords. Used by
 * `scripts/create-admin.ts`; there is deliberately no HTTP route for either.
 */
import { pool } from '../db';
import { passwords } from './passwords';
import { emailHash } from './throttle';

/** The same pattern as the CHECK on `users.email`. */
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export const PASSWORD_MIN = 12;
export const PASSWORD_MAX = 1024;

/** Trimmed and lowercased: how emails are stored, looked up and hashed. */
export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return email.length <= 254 && EMAIL_PATTERN.test(email);
}

export class AccountError extends Error {}

export interface AdminInput {
  email: string;
  fullName: string | null;
  password: string;
  /** Replace the password of an existing user instead of refusing. */
  resetPassword: boolean;
}

export type AdminResult = 'created' | 'password_reset';

export async function createOrResetAdmin(input: AdminInput): Promise<AdminResult> {
  const email = normaliseEmail(input.email);
  if (!isValidEmail(email)) throw new AccountError(`Not a valid email: ${email}`);

  if (input.password.length < PASSWORD_MIN || input.password.length > PASSWORD_MAX) {
    throw new AccountError(
      `The password must be ${PASSWORD_MIN}–${PASSWORD_MAX} characters.`
    );
  }

  const passwordHash = await passwords.hash(input.password);
  const client = await pool.connect();

  try {
    await client.query('begin');

    const { rows } = await client.query<{ id: string }>(
      'select id from public.users where lower(email) = $1 for update',
      [email]
    );
    const existing = rows[0];

    if (!existing) {
      await client.query(
        'insert into public.users (email, password_hash, full_name) values ($1, $2, $3)',
        [email, passwordHash, input.fullName]
      );
      await client.query('commit');
      return 'created';
    }

    if (!input.resetPassword) {
      throw new AccountError(
        `${email} already exists. Add --reset-password to replace its password.`
      );
    }

    // A new password ends every session signed in with the old one, and
    // forgives the failures that may have prompted the reset.
    await client.query(
      'update public.users set password_hash = $2, full_name = coalesce($3, full_name) where id = $1',
      [existing.id, passwordHash, input.fullName]
    );
    await client.query('delete from public.sessions where user_id = $1', [existing.id]);
    await client.query(
      'delete from public.login_attempts where email_hash = $1 and not succeeded',
      [emailHash(email)]
    );
    await client.query('commit');
    return 'password_reset';
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * True when this email is the site's public contact address. The Footer
 * publishes that address, so using it to sign in hands half the credentials
 * to anyone who reads the page.
 */
export async function isPublicContactEmail(email: string): Promise<boolean> {
  const { rows } = await pool.query<{ contact_email: string }>(
    'select contact_email from public.site_settings where id'
  );
  const contact = rows[0]?.contact_email;
  return contact !== undefined && normaliseEmail(contact) === normaliseEmail(email);
}
