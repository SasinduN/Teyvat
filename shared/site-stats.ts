/**
 * The stats strip (Admin → Settings, `site_settings.stats`, migration 0021): up
 * to four numbers with a label, an optional suffix and an order. The public site
 * hides the strip when there are none.
 *
 * Every number shown should have a source: the sources for the seeded ones are in
 * `docs/reviews/generic-ui-audit.md`.
 */
export const MAX_SITE_STATS = 4;
export const MAX_STAT_LABEL = 70;
export const MAX_STAT_SUFFIX = 6;
export const MAX_STAT_NUMBER = 9_999_999;

export interface SiteStat {
  label: string;
  number: number;
  /** After the number: `km`, `+`. May be empty. */
  suffix: string;
  /** 1 comes first. */
  order: number;
}

/** A row as the form holds it: what was typed, before it is checked. */
export interface SiteStatDraft {
  label?: unknown;
  number?: unknown;
  suffix?: unknown;
  order?: unknown;
}

const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
const typed = (value: unknown) => (typeof value === 'number' ? String(value) : text(value));

/**
 * The rows to store, or what is wrong with them. A row with neither a label nor a
 * number is an empty row and is dropped. Problems name the row by its place in the form.
 */
export function parseSiteStats(rows: unknown): { stats: SiteStat[]; problems: string[] } {
  if (!Array.isArray(rows)) return { stats: [], problems: ['Stats must be a list.'] };
  const problems: string[] = [];
  const stats: SiteStat[] = [];
  rows.forEach((row: SiteStatDraft | null, index) => {
    const name = `Stat ${index + 1}`;
    const label = text(row?.label);
    const number = typed(row?.number);
    const suffix = text(row?.suffix);
    const order = typed(row?.order);
    if (!label && !number) return;
    if (!label) problems.push(`${name}: add a label, or clear its number.`);
    if (label.length > MAX_STAT_LABEL) problems.push(`${name}: keep the label to ${MAX_STAT_LABEL} characters.`);
    if (!/^\d+$/.test(number) || Number(number) > MAX_STAT_NUMBER) {
      problems.push(`${name}: the number must be a whole number from 0 to ${MAX_STAT_NUMBER.toLocaleString('en-GB')}.`);
    }
    if (suffix.length > MAX_STAT_SUFFIX) problems.push(`${name}: keep the suffix to ${MAX_STAT_SUFFIX} characters.`);
    if (order && (!/^\d+$/.test(order) || Number(order) < 1 || Number(order) > MAX_SITE_STATS)) {
      problems.push(`${name}: the order must be from 1 to ${MAX_SITE_STATS}.`);
    }
    stats.push({ label, number: Number(number), suffix, order: order ? Number(order) : index + 1 });
  });
  if (stats.length > MAX_SITE_STATS) problems.push(`Up to ${MAX_SITE_STATS} stats.`);
  return { stats, problems };
}

/** What the public site shows, in order. Equal orders keep their place in the list. */
export function visibleStats(stats: readonly SiteStat[] | null | undefined): SiteStat[] {
  return (stats ?? [])
    .filter((stat) => stat.label.trim() !== '' && Number.isFinite(stat.number))
    .map((stat, index) => ({ stat, index }))
    .sort((a, b) => a.stat.order - b.stat.order || a.index - b.index)
    .slice(0, MAX_SITE_STATS)
    .map(({ stat }) => stat);
}

/** `1,620 km`, `2,200+`, `8`. A word gets a space; a sign doesn't. */
export function formatStat(stat: Pick<SiteStat, 'number' | 'suffix'>): string {
  const number = stat.number.toLocaleString('en-GB');
  if (!stat.suffix) return number;
  return /^[\p{L}]/u.test(stat.suffix) ? `${number} ${stat.suffix}` : `${number}${stat.suffix}`;
}
