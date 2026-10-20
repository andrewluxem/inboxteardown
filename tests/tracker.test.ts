import { describe, expect, it } from 'vitest';
import { trackerSchema, type Tracker } from '../src/lib/schemas';
import { blackFridayDates, dayLabel, launchGrid, showsData, startedDefinition, unknownTrackerBrands } from '../src/lib/tracker';

describe('Black Friday dates', () => {
  it('is the day after the fourth Thursday of November, with Cyber Monday 3 days later', () => {
    expect(blackFridayDates(2026)).toEqual({ bf: '2026-11-27', cm: '2026-11-30' });
    expect(blackFridayDates(2025)).toEqual({ bf: '2025-11-28', cm: '2025-12-01' });
  });
});

describe('started definition', () => {
  // The public wording of the scorer's bfcm.py rule.
  const text = startedDefinition('2026-11-02');
  it('names the start date, every term and every field searched', () => {
    expect(text).toContain('on or after Nov 2');
    for (const term of ['Black Friday', 'BFCM', 'Cyber Monday', 'Cyber Week', 'Early Access alongside Black Friday or Cyber wording']) {
      expect(text).toContain(term);
    }
    expect(text).toContain('subject, preheader, body (excluding the footer) and image alt text');
  });
  it('has no em dash', () => {
    expect(text).not.toContain('\u2014');
  });
});

describe('launch grid', () => {
  it('has one column per day from Nov 2 to Nov 30 (29 days)', () => {
    const { calendar } = launchGrid('2026-11-02', '2026-11-30');
    expect(calendar).toHaveLength(29);
    expect(calendar[0]).toBe('2026-11-02');
    expect(calendar.at(-1)).toBe('2026-11-30');
  });
  it('labels the axis from the start date, never Nov 1', () => {
    const { calendar, axis } = launchGrid('2026-11-02', '2026-11-30');
    expect(axis.has('2026-11-01')).toBe(false);
    expect(axis.get('2026-11-02')).toEqual({ date: 'Nov 2' });
    expect([...axis.keys()].every((d) => calendar.includes(d))).toBe(true);
    expect(Object.fromEntries(axis)).toEqual({
      '2026-11-02': { date: 'Nov 2' },
      '2026-11-09': { date: '9' },
      '2026-11-16': { date: '16' },
      '2026-11-23': { date: '23' },
      '2026-11-27': { top: 'BF', date: 'Nov 27' },
      '2026-11-30': { top: 'CM', date: 'Nov 30' },
    });
  });
  it('follows any range length', () => {
    expect(launchGrid('2026-11-01', '2026-11-30').calendar).toHaveLength(30);
    expect(launchGrid('2026-11-02', '2026-11-02').calendar).toHaveLength(1);
  });
});

describe('day label', () => {
  const base: Tracker = {
    slug: 'black-friday-2026', title: 'Black Friday 2026 tracker', start: '2026-11-02', end: '2026-11-30',
    cohort_frozen: '2026-10-26', published: false, cohort_size: 3, days: [], brands: [], categories: [],
  };
  it('says "Starts Nov 2" before day 1, never "Day 0"', () => {
    expect(dayLabel('2026-11-02')).toBe('Starts Nov 2');
    expect(dayLabel('2026-11-02', base)).toBe('Starts Nov 2');
    expect(showsData(base)).toBe(false);
    expect(showsData(undefined)).toBe(false);
  });
  const days = [{ date: '2026-11-04', launched_cumulative: 1, sends: 4, sends_vs_baseline: 0 }];
  it('stays "Starts Nov 2" while unpublished, even with data', () => {
    expect(showsData({ ...base, days })).toBe(false);
    expect(dayLabel(base.start, { ...base, days })).toBe('Starts Nov 2');
  });
  it('counts days from the start once published with data', () => {
    const t = { ...base, published: true, days };
    expect(showsData(t)).toBe(true);
    expect(dayLabel(t.start, t)).toBe('Day 3 of 29');
    expect(dayLabel(t.start, { ...t, days: [] })).toBe('Starts Nov 2');
  });
});

describe('tracker invariants', () => {
  const ok = {
    slug: 'black-friday-2026', title: 'T', start: '2026-11-02', end: '2026-11-30', cohort_frozen: '2026-10-26',
    published: false, cohort_size: 5,
    days: [
      { date: '2026-11-02', launched_cumulative: 1, sends: 3, sends_vs_baseline: 0 },
      { date: '2026-11-03', launched_cumulative: 2, sends: 3, sends_vs_baseline: 0 },
    ],
    brands: [
      { brand: 'A', brand_slug: 'a', first_mention: '2026-11-02', discount: null, sends_since: 1, avg_score: 20 },
      { brand: 'B', brand_slug: 'b', first_mention: '2026-11-03', discount: 10, sends_since: 1, avg_score: 20 },
    ],
    categories: [],
  };
  const messages = (t: unknown) => {
    const r = trackerSchema.safeParse(t);
    return r.success ? [] : r.error.issues.map((i) => i.message);
  };

  it('accepts a consistent tracker, and an empty one', () => {
    expect(messages(ok)).toEqual([]);
    expect(messages({ ...ok, days: [], brands: [] })).toEqual([]);
  });
  it('rejects launched_cumulative going down, in date order', () => {
    const days = [ok.days[1], { ...ok.days[0], date: '2026-11-04', launched_cumulative: 1 }];
    expect(messages({ ...ok, days, brands: ok.brands.slice(0, 1) }).join()).toMatch(/never decreases/);
  });
  it('rejects a repeated date', () => {
    expect(messages({ ...ok, days: [ok.days[0], ok.days[0], ok.days[1]] }).join()).toMatch(/more than once/);
  });
  it('rejects a launched count that differs from brands.length', () => {
    expect(messages({ ...ok, brands: ok.brands.slice(0, 1) }).join()).toMatch(/1 brands listed but the latest launched_cumulative is 2/);
    expect(messages({ ...ok, days: [] }).join()).toMatch(/2 brands listed but the latest launched_cumulative is 0/);
  });
  it('rejects a first mention before start', () => {
    const brands = [{ ...ok.brands[0], first_mention: '2026-11-01' }, ok.brands[1]];
    expect(messages({ ...ok, brands }).join()).toMatch(/2026-11-01 is before start 2026-11-02/);
  });
  it('flags brand slugs that are not in board data', () => {
    expect(unknownTrackerBrands(trackerSchema.parse(ok), ['a', 'c'])).toEqual(['b']);
    expect(unknownTrackerBrands(trackerSchema.parse(ok), ['a', 'b'])).toEqual([]);
  });
});
