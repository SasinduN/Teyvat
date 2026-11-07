/**
 * `/when-to-go`: how a destination suits a month, from `destinations.best_months`
 * (migration 0022). Plain functions, for the page, its map and the tests.
 */
export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
] as const;

/** Months as stored: 1 is January. */
export const MONTH_NUMBERS = MONTH_NAMES.map((_, i) => i + 1);

export const monthName = (month: number): string => MONTH_NAMES[month - 1];

/** Great: a best month. OK: next to one. Not ideal: neither. Not set: no best months at all. */
export type Suitability = 'great' | 'ok' | 'not-ideal' | 'not-set';

/** Most suitable first: the legend's order, and the order markers stack in. */
export const SUITABILITIES: readonly Suitability[] = ['great', 'ok', 'not-ideal', 'not-set'];

export const SUITABILITY_LABELS: Readonly<Record<Suitability, string>> = {
  great: 'Great',
  ok: 'OK',
  'not-ideal': 'Not ideal',
  'not-set': 'Not set'
};

export const SUITABILITY_MEANINGS: Readonly<Record<Suitability, string>> = {
  great: 'one of its best months',
  ok: 'next to one of its best months',
  'not-ideal': 'not near its best months',
  'not-set': 'its best months are not set yet'
};

export function suitability(bestMonths: readonly number[], month: number): Suitability {
  if (bestMonths.length === 0) return 'not-set';
  if (bestMonths.includes(month)) return 'great';
  const before = month === 1 ? 12 : month - 1;
  const after = month === 12 ? 1 : month + 1;
  return bestMonths.includes(before) || bestMonths.includes(after) ? 'ok' : 'not-ideal';
}

/** What a marker and its popup say: "Great in March", "Not set". */
export function suitabilityPhrase(value: Suitability, month: number): string {
  return value === 'not-set' ? SUITABILITY_LABELS[value] : `${SUITABILITY_LABELS[value]} in ${monthName(month)}`;
}

/** Today's month in Sri Lanka, wherever the visitor is. */
export function monthInColombo(now: Date = new Date()): number {
  return Number(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Colombo', month: 'numeric' }).format(now));
}

/** Sorted, each month once: what the form sends and the API stores. */
export const normalizeMonths = (months: readonly number[]): number[] => [...new Set(months)].sort((a, b) => a - b);

/** The explainer's paragraphs: separated by a blank line in Admin → Settings. */
export const explainerParagraphs = (text: string | null | undefined): string[] =>
  (text ?? '').split(/\r?\n\s*\r?\n/).map((paragraph) => paragraph.trim()).filter(Boolean);
