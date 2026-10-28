// A brand's send order on one board: "2nd of 3". The exporter sets
// send_index / send_count once per board, so filters never change them, and
// boards exported before the fields existed show no order at all.
import type { FlatEmail } from './brands';
import type { Email } from './schemas';

/** 1 -> "1st", 2 -> "2nd", 11 -> "11th", 23 -> "23rd". */
export function ordinal(n: number): string {
  const teen = n % 100 >= 11 && n % 100 <= 13;
  const suffix = teen ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th';
  return `${n}${suffix}`;
}

/** "2nd of 3", or undefined for a brand's only send or a board without send order. */
export function sendOrdinal(e: Pick<Email, 'send_index' | 'send_count'>): string | undefined {
  if (e.send_index === undefined || e.send_count === undefined || e.send_count < 2) return undefined;
  return `${ordinal(e.send_index)} of ${e.send_count}`;
}

/** The send time to show: sent_at_local when the exporter set it, else sent_at. */
export function sendTime(e: Pick<Email, 'sent_at' | 'sent_at_local'>): Date {
  return e.sent_at_local ? new Date(e.sent_at_local) : e.sent_at;
}

/**
 * Every send from this email's brand on the same board, this one included,
 * in send order. Empty when the email has no ordinal to show.
 */
export function boardSiblings(all: FlatEmail[], email: FlatEmail): FlatEmail[] {
  if (!sendOrdinal(email)) return [];
  return all
    .filter((e) => e.boardDate === email.boardDate && e.brand_slug === email.brand_slug && e.send_index !== undefined)
    .sort((a, b) => a.send_index! - b.send_index!);
}
