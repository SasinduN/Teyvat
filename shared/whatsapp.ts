import { paths } from './site-paths';

/**
 * The WhatsApp chat button: the number rules that the admin form, the API
 * and the database (`0008_site_settings_whatsapp.sql`) all apply, and the
 * `wa.me` links the public site and the admin build.
 *
 * A plain link: no widget, no script, nothing sent anywhere until the visitor
 * taps it.
 */

/** Digits only, 8–15 of them (E.164), not starting 0. Same as the CHECK. */
export const WHATSAPP_NUMBER_PATTERN = /^[1-9][0-9]{7,14}$/;

/** What an admin may type around the digits: spaces, dashes, dots, brackets, a leading +. */
export function normalizeWhatsAppNumber(input: string): string {
  return input.trim().replace(/^\+/, '').replace(/[\s\-.()]/g, '');
}

/**
 * Why a normalised number is refused, or null when it is fine. The two
 * likeliest mistakes get their own message: a local number (`0771234567`)
 * and the country code plus the local 0 (`940771234567`).
 */
export function whatsappNumberProblem(digits: string): string | null {
  if (!/^[0-9]+$/.test(digits)) return 'Use digits only, e.g. 94771234567.';
  if (digits.startsWith('0')) return 'Start with the country code (94 for Sri Lanka), not 0.';
  if (digits.startsWith('940')) return 'Remove the 0 after 94.';
  if (!WHATSAPP_NUMBER_PATTERN.test(digits)) {
    return 'Enter 8 to 15 digits, including the country code, e.g. 94771234567.';
  }
  return null;
}

/** What the visitor is looking at, which decides the pre-filled message. */
export type WhatsAppContext =
  | { kind: 'tour'; id: string; title: string }
  | { kind: 'destination'; id: string; name: string }
  | { kind: 'experience'; id: string; title: string }
  | { kind: 'general' };

/**
 * The message, with a link to the page the visitor was looking at, so
 * whoever answers sees exactly that.
 */
export function whatsappMessage(context: WhatsAppContext, origin: string): string {
  switch (context.kind) {
    case 'tour':
      return `Hi! I'm interested in the ${context.title} tour. ${origin}${paths.tour(context.id)}`;
    case 'destination':
      return `Hi! I'd like to know more about visiting ${context.name}. ${origin}${paths.destination(context.id)}`;
    case 'experience':
      return `Hi! I'm interested in the ${context.title} experience. ${origin}${paths.experience(context.id)}`;
    case 'general':
      return "Hi! I'd like help planning a trip to Sri Lanka.";
  }
}

/** `https://wa.me/<number>`, with the message pre-filled when one is given. */
export function whatsappUrl(number: string, message?: string): string {
  const base = `https://wa.me/${number}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
