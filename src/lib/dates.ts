// Calendar dates are plain `YYYY-MM-DD` strings; timestamps are Dates.
// Everything shown to readers is in Mountain Time.
export const TZ = 'America/Denver';

const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });

/** The calendar date of a timestamp in Mountain Time. */
export function mtDate(d: Date): string {
  return ymd.format(d);
}

function utcNoon(iso: string): Date {
  return new Date(`${iso}T12:00:00Z`);
}

export function addDays(iso: string, n: number): string {
  const d = utcNoon(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Inclusive list of dates from `start` to `end`. */
export function dateRange(start: string, end: string): string[] {
  const out: string[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) out.push(d);
  return out;
}

export function daysBetween(a: string, b: string): number {
  return Math.round((utcNoon(b).getTime() - utcNoon(a).getTime()) / 86_400_000);
}

const long = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
const medium = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
const short = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

/** "Wed, Oct 7, 2026" becomes "Wed Oct 7, 2026". */
export function formatLong(iso: string): string {
  return long.format(utcNoon(iso)).replace(',', '');
}

export function formatMedium(iso: string): string {
  return medium.format(utcNoon(iso));
}

export function formatShort(iso: string): string {
  return short.format(utcNoon(iso));
}

const time = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: TZ });

/** "7:00 am MT" */
export function formatTimeMT(d: Date): string {
  return `${time.format(d).replace(' AM', ' am').replace(' PM', ' pm')} MT`;
}

/** "Oct 6, 2026, 6:42 pm MT" */
export function formatDateTimeMT(d: Date): string {
  return `${formatMedium(mtDate(d))}, ${formatTimeMT(d)}`;
}
