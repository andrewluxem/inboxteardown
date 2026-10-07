// Brand pages are derived, never authored: every scoreboard file is flattened
// and grouped by brand_slug. Free pages only ever see a 30-day window.
import { DIMENSION_KEYS, type DimensionKey } from '../config/rubric';
import type { IndustryKey } from '../config/industries';
import { addDays, dateRange, mtDate } from './dates';
import type { Email, ScoreboardDay } from './schemas';
import { average, score, type Scored } from './scoring';

export const FREE_WINDOW_DAYS = 30;

export interface FlatEmail extends Email {
  /** Date of the scoreboard file the email appeared on. */
  boardDate: string;
  /** Calendar date the email was sent, in Mountain Time. */
  sendDate: string;
  rubricVersion: string;
}

export function flatten(days: ScoreboardDay[]): FlatEmail[] {
  return days.flatMap((d) =>
    d.emails.map((e) => ({ ...e, boardDate: d.date, sendDate: mtDate(e.sent_at), rubricVersion: d.rubric_version })),
  );
}

/**
 * The last send day covered by the data: the day before the newest
 * scoreboard, since a scoreboard scores the prior day's sends.
 */
export function windowEnd(days: Pick<ScoreboardDay, 'date'>[]): string {
  const latest = days.map((d) => d.date).sort().at(-1);
  if (!latest) throw new Error('No scoreboard data');
  return addDays(latest, -1);
}

export function windowStart(end: string, windowDays = FREE_WINDOW_DAYS): string {
  return addDays(end, -(windowDays - 1));
}

export function inWindow(emails: FlatEmail[], end: string, windowDays = FREE_WINDOW_DAYS): FlatEmail[] {
  const start = windowStart(end, windowDays);
  return emails.filter((e) => e.sendDate >= start && e.sendDate <= end);
}

export type DimAverages = Record<DimensionKey, number>;

function dimAverages(emails: FlatEmail[]): DimAverages {
  return Object.fromEntries(
    DIMENSION_KEYS.map((k) => [k, average(emails.map((e) => e.dimensions[k].score))]),
  ) as DimAverages;
}

export interface StripDay {
  date: string;
  sends: Scored<FlatEmail>[];
}

export interface BrandSummary {
  slug: string;
  name: string;
  industry: IndustryKey;
  /** First send seen anywhere in the data, not only in the window. */
  trackedSince: string;
  windowStart: string;
  windowEnd: string;
  sends: Scored<FlatEmail>[];
  avgTotal: number;
  sendsPerWeek: number;
  hardFails: number;
  strip: StripDay[];
  dimAvgs: DimAverages;
  industryDimAvgs: DimAverages;
  rank: number;
  rankOf: number;
  themes: [string, number][];
}

export function brandSlugs(emails: FlatEmail[]): string[] {
  return [...new Set(emails.map((e) => e.brand_slug))].sort();
}

function latestFirst(a: { email: FlatEmail }, b: { email: FlatEmail }): number {
  return b.email.sent_at.getTime() - a.email.sent_at.getTime();
}

/** Rank brands within one industry by 30-day average total. */
export function industryRanking(windowed: FlatEmail[], industry: IndustryKey): { slug: string; avg: number; name: string }[] {
  // A brand belongs to the industry of its most recent send.
  const bySlug = new Map<string, FlatEmail[]>();
  for (const e of windowed) bySlug.set(e.brand_slug, [...(bySlug.get(e.brand_slug) ?? []), e]);
  return [...bySlug.entries()]
    .map(([slug, es]) => ({ slug, es: [...es].sort((a, b) => b.sent_at.getTime() - a.sent_at.getTime()) }))
    .filter(({ es }) => es[0]!.industry === industry)
    .map(({ slug, es }) => ({ slug, name: es[0]!.brand, avg: average(es.map((e) => score(e).total)) }))
    .sort((a, b) => b.avg - a.avg || a.name.localeCompare(b.name));
}

export function summarizeBrand(
  all: FlatEmail[],
  slug: string,
  end: string,
  windowDays = FREE_WINDOW_DAYS,
): BrandSummary | undefined {
  const windowed = inWindow(all, end, windowDays);
  const mine = windowed.filter((e) => e.brand_slug === slug);
  if (!mine.length) return undefined;

  const sends = mine.map(score).sort(latestFirst);
  const latest = sends[0]!.email;
  const industry = latest.industry;
  const start = windowStart(end, windowDays);

  const strip = dateRange(start, end).map((date) => ({
    date,
    sends: sends.filter((s) => s.email.sendDate === date).reverse(),
  }));

  const ranking = industryRanking(windowed, industry);
  const industryEmails = windowed.filter((e) => ranking.some((r) => r.slug === e.brand_slug));

  const themeCounts = new Map<string, number>();
  for (const e of mine) for (const t of e.themes) themeCounts.set(t, (themeCounts.get(t) ?? 0) + 1);

  return {
    slug,
    name: latest.brand,
    industry,
    trackedSince: all.filter((e) => e.brand_slug === slug).map((e) => e.sendDate).sort()[0]!,
    windowStart: start,
    windowEnd: end,
    sends,
    avgTotal: average(sends.map((s) => s.total)),
    sendsPerWeek: (sends.length / windowDays) * 7,
    hardFails: sends.filter((s) => s.capped).length,
    strip,
    dimAvgs: dimAverages(mine),
    industryDimAvgs: dimAverages(industryEmails),
    rank: ranking.findIndex((r) => r.slug === slug) + 1,
    rankOf: ranking.length,
    themes: [...themeCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])),
  };
}
