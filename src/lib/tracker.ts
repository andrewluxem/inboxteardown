import { dateRange, daysBetween, formatShort } from './dates';
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

/** What counts as a brand having "started" Black Friday, in plain words. */
export function startedDefinition(start: string): string {
  return `A brand has started Black Friday when its first email that mentions Black Friday or Cyber Monday by name, in the subject or the body, lands in our inbox on or after ${formatShort(start)}.`;
}
