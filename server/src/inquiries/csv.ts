/**
 * The inbox's CSV export.
 *
 * Enquiry text is written by strangers and admins open the file in Excel, so
 * a cell like `=HYPERLINK("http://evil","Click")` or `@SUM(…)` must arrive as
 * text, not as a formula. Any cell starting with `=`, `+`, `-`, `@`, a tab or
 * a carriage return (OWASP's list, plus the two whitespace starts Excel also
 * acts on) gets a leading `'`, which Excel reads as "this is text".
 *
 * Phone numbers are the exception. Left alone, Excel reads `+94 77 123 4567`
 * as a formula (the spaces make it an error) and strips the leading zero
 * from `0771234567`; with a `'` they show the apostrophe. So a phone value
 * made only of digits, spaces and `+ - ( )` is written as the formula
 * `="+94 77 123 4567"`, which Excel displays as exactly that text. It is safe
 * because the pattern admits no `"`, so the value can't leave the string. A
 * phone value with anything else in it is escaped like every other cell.
 */
import type { InquiryRow } from '../../../shared/database.types';

const FORMULA_START = /^[=+\-@\t\r]/;
const PHONE_ONLY = /^[0-9 +()\-]+$/;

export function csvCell(value: unknown, options: { phone?: boolean } = {}): string {
  let text = value === null || value === undefined ? '' : String(value);
  if (options.phone && PHONE_ONLY.test(text)) {
    text = `="${text}"`;
  } else if (FORMULA_START.test(text)) {
    text = `'${text}`;
  }
  // RFC 4180: every field quoted, quotes doubled. Newlines stay inside quotes.
  return `"${text.replace(/"/g, '""')}"`;
}

const COLUMNS: Array<{ header: string; value: (r: InquiryRow) => unknown; phone?: boolean }> = [
  { header: 'Received', value: (r) => r.created_at },
  { header: 'Status', value: (r) => r.status },
  { header: 'Name', value: (r) => r.name },
  { header: 'Email', value: (r) => r.email },
  { header: 'Phone', value: (r) => r.phone, phone: true },
  { header: 'Travellers', value: (r) => r.travelers },
  { header: 'Dates', value: (r) => r.dates },
  { header: 'Subject', value: (r) => r.subject },
  { header: 'Message', value: (r) => r.message },
  { header: 'Admin notes', value: (r) => r.admin_notes },
  { header: 'Closed', value: (r) => r.closed_at }
];

/** UTF-8 byte-order mark: without it Excel reads Sinhala and Tamil as mojibake. */
const BOM = '﻿';

export function inquiriesCsv(rows: InquiryRow[]): string {
  const timestamp = (v: unknown) => (v instanceof Date ? v.toISOString() : v);
  const lines = [
    COLUMNS.map((c) => csvCell(c.header)).join(','),
    ...rows.map((row) =>
      COLUMNS.map((c) => csvCell(timestamp(c.value(row)), { phone: c.phone })).join(',')
    )
  ];
  return `${BOM}${lines.join('\r\n')}\r\n`;
}
