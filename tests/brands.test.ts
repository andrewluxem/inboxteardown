import { describe, expect, it } from 'vitest';
import { coveredSendDays, flatten, inWindow, summarizeBrand, windowEnd } from '../src/lib/brands';
import type { ScoreboardDay } from '../src/lib/schemas';
import { dims, makeEmail } from './helpers';

function day(date: string, sentAt: string, slug: string, score: number, industry: 'food' | 'home' = 'food'): ScoreboardDay {
  return {
    date,
    generated_at: new Date(`${date}T13:00:00Z`),
    rubric_version: '1.0',
    emails: [
      makeEmail({ id: `${slug}-${date}`, brand: slug, brand_slug: slug, industry, sent_at: new Date(sentAt), dimensions: dims(score) }),
    ],
  };
}

describe('brand aggregation', () => {
  // Scoreboard dated Oct 31 scores sends from Oct 30, so the window is Oct 1..Oct 30.
  const days = [
    day('2026-09-30', '2026-09-29T18:00:00Z', 'alpha', 2), // 30+ days old: excluded
    day('2026-10-01', '2026-09-30T18:00:00Z', 'alpha', 2), // send day Sep 30: one day outside
    day('2026-10-02', '2026-10-01T18:00:00Z', 'alpha', 4), // first day inside
    day('2026-10-31', '2026-10-30T18:00:00Z', 'alpha', 5), // last day inside
  ];
  const all = flatten(days);
  const end = windowEnd(days);

  it('ends the window on the day before the latest scoreboard', () => {
    expect(end).toBe('2026-10-30');
  });

  it('limits to 30 days', () => {
    const windowed = inWindow(all, end);
    expect(windowed.map((e) => e.sendDate)).toEqual(['2026-10-01', '2026-10-30']);
  });

  it('computes brand stats only from the window', () => {
    const s = summarizeBrand(all, 'alpha', end)!;
    expect(s.sends).toHaveLength(2);
    expect(s.avgTotal).toBe((32 + 40) / 2);
    expect(s.strip).toHaveLength(30);
    expect(s.strip[0]!.date).toBe('2026-10-01');
    expect(s.strip.at(-1)!.date).toBe('2026-10-30');
    // Tracked-since is the first send ever seen, not the window start.
    expect(s.trackedSince).toBe('2026-09-29');
  });

  it('ranks a brand within its industry', () => {
    const more = [...days, day('2026-10-20', '2026-10-19T18:00:00Z', 'beta', 5), day('2026-10-21', '2026-10-20T18:00:00Z', 'gamma', 3, 'home')];
    const s = summarizeBrand(flatten(more), 'alpha', windowEnd(more))!;
    expect(s.rank).toBe(2);
    expect(s.rankOf).toBe(2);
  });

  it('returns undefined for a brand with no sends in the window', () => {
    expect(summarizeBrand(all, 'nobody', end)).toBeUndefined();
  });
});

describe('sends per week', () => {
  // A brand that sends every day for a week should read 7.0, not 7/30*7.
  const week = ['2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18', '2026-10-19'];
  const days = week.map((d) => day(d, `${d}T00:00:00Z`, 'alpha', 3)); // 6 pm MT the day before

  it('divides by the send days a scoreboard covers, not the 30-day window', () => {
    const all = flatten(days);
    const s = summarizeBrand(all, 'alpha', windowEnd(days))!;
    expect(coveredSendDays(all, windowEnd(days))).toEqual(['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18']);
    expect(s.coveredDays).toBe(7);
    expect(s.sendsPerWeek).toBe(7);
  });

  it('leaves out a day whose board never published', () => {
    const missing = days.filter((d) => d.date !== '2026-10-18');
    const all = flatten(missing);
    const s = summarizeBrand(all, 'alpha', windowEnd(missing))!;
    expect(s.coveredDays).toBe(6);
    expect(s.sendsPerWeek).toBe(7);
  });

  it('counts coverage across the whole panel, so a quiet brand is not inflated', () => {
    // beta sent once in the week every board covered: 1 send over 7 days.
    const withBeta = [...days, day('2026-10-21', '2026-10-20T00:00:00Z', 'beta', 3)];
    const all = flatten(withBeta);
    const s = summarizeBrand(all, 'beta', windowEnd(withBeta))!;
    expect(s.coveredDays).toBe(8);
    expect(s.sendsPerWeek).toBeCloseTo(7 / 8);
  });

  it('uses the full window once 30 days are covered', () => {
    const month = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(Date.UTC(2026, 9, 2 + i)).toISOString().slice(0, 10);
      return day(d, `${d}T00:00:00Z`, 'alpha', 3);
    });
    const s = summarizeBrand(flatten(month), 'alpha', windowEnd(month))!;
    expect(s.coveredDays).toBe(30);
    expect(s.sendsPerWeek).toBe(7);
  });
});
