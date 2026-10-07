import { describe, expect, it } from 'vitest';
import { flatten, inWindow, summarizeBrand, windowEnd } from '../src/lib/brands';
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
