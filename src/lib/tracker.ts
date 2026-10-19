import { addDays, dateRange, daysBetween, formatShort } from './dates';
import type { Tracker } from './schemas';

/** Headline numbers shared by the tracker page and its OG image. */
export function trackerProgress(t: Tracker) {
  const latest = [...t.days].sort((a, b) => a.date.localeCompare(b.date)).at(-1);
  return {
    latest,
    dayN: latest ? daysBetween(t.start, latest.date) + 1 : 0,
    totalDays: dateRange(t.start, t.end).length,
    launched: latest?.launched_cumulative ?? 0,
  };
}

/**
 * Tracker brands whose brand_slug is not in the board data. A per-file
 * schema cannot see the boards, so src/lib/content.ts runs this at build.
 */
export function unknownTrackerBrands(t: Pick<Tracker, 'brands'>, boardSlugs: Iterable<string>): string[] {
  const known = new Set(boardSlugs);
  return t.brands.map((b) => b.brand_slug).filter((slug) => !known.has(slug));
}

/** True once the tracker has a day of data; before that the page is the pre-start page. */
export function hasStarted(t: Tracker | undefined): boolean {
  return !!t && t.days.length > 0;
}

/** "Starts Nov 2" before day 1, then "Day 3 of 29". Never "Day 0". */
export function dayLabel(start: string, t?: Tracker): string {
  if (!t || !hasStarted(t)) return `Starts ${formatShort(start)}`;
  const { dayN, totalDays } = trackerProgress(t);
  return `Day ${dayN} of ${totalDays}`;
}

/** What counts as a brand having "started" Black Friday, in plain words. */
export function startedDefinition(start: string): string {
  return `A brand has started Black Friday when its first email that mentions Black Friday or Cyber Monday by name, in the subject or the body, lands in our inbox on or after ${formatShort(start)}.`;
}

/** Black Friday (the day after the fourth Thursday of November) and Cyber Monday. */
export function blackFridayDates(year: number): { bf: string; cm: string } {
  const nov1 = new Date(Date.UTC(year, 10, 1)).getUTCDay();
  const thanksgiving = 1 + ((4 - nov1 + 7) % 7) + 21;
  const bf = `${year}-11-${String(thanksgiving + 1).padStart(2, '0')}`;
  return { bf, cm: addDays(bf, 3) };
}

export interface AxisMark {
  top?: string;
  date: string;
}

/**
 * The launch chart's columns, one per day from `start` to `end`, and the axis
 * labels under them: the first day, then every 7th day after it, plus BF and
 * CM. A weekly label within 2 days of BF or CM is dropped so they don't collide.
 */
export function launchGrid(start: string, end: string): { calendar: string[]; axis: Map<string, AxisMark> } {
  const calendar = dateRange(start, end);
  const { bf, cm } = blackFridayDates(Number(start.slice(0, 4)));
  const marked = [bf, cm].filter((d) => d >= start && d <= end);
  const axis = new Map<string, AxisMark>();
  let month = '';
  calendar.forEach((date, i) => {
    if (i % 7 !== 0 || marked.some((m) => Math.abs(daysBetween(date, m)) <= 2)) return;
    const label = formatShort(date);
    axis.set(date, { date: date.slice(5, 7) === month ? label.replace(/^\S+ /, '') : label });
    month = date.slice(5, 7);
  });
  if (marked.includes(bf)) axis.set(bf, { top: 'BF', date: formatShort(bf) });
  if (marked.includes(cm)) axis.set(cm, { top: 'CM', date: formatShort(cm) });
  return { calendar, axis };
}
