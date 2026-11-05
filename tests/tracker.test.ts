import { describe, expect, it } from 'vitest';
import { trackerSchema, type Tracker } from '../src/lib/schemas';
import {
  blackFridayDates,
  dayLabel,
  earliestMention,
  firstMentionRows,
  firstUpdate,
  launchGrid,
  preStartLabel,
  preStartNote,
  showsData,
  startedDefinition,
  unknownTrackerBrands,
} from '../src/lib/tracker';

describe('Black Friday dates', () => {
  it('is the day after the fourth Thursday of November, with Cyber Monday 3 days later', () => {
    expect(blackFridayDates(2026)).toEqual({ bf: '2026-11-27', cm: '2026-11-30' });
    expect(blackFridayDates(2025)).toEqual({ bf: '2025-11-28', cm: '2025-12-01' });
  });
});

describe('started definition', () => {
  // The public wording of the scorer's bfcm.py rule.
  const text = startedDefinition();
  it('names every term and every field searched, with no start bound', () => {
    expect(text).toContain('first email in our inbox that mentions Black Friday, BFCM');
    expect(text).not.toContain('on or after');
    for (const term of ['Black Friday', 'BFCM', 'Cyber Monday', 'Cyber Week', 'Early Access alongside Black Friday or Cyber wording']) {
      expect(text).toContain(term);
    }
    expect(text).toContain('subject, preheader, body (excluding the footer) and image alt text');
  });
  it('has no em dash', () => {
    expect(text).not.toContain('\u2014');
    expect(preStartNote('2026-11-02')).not.toContain('\u2014');
  });
  it('explains Before Nov 2 from the start date', () => {
    expect(preStartNote('2026-11-02')).toBe(
      'Daily tracking began Nov 2; brands that mentioned Black Friday earlier (back to Oct 19, when we began recording it) are marked Before Nov 2.',
    );
    expect(preStartLabel('2027-11-01')).toBe('Before Nov 1');
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
  it('says "First update Nov 3" (the day after start) before day 1, never "Day 0"', () => {
    expect(firstUpdate('2026-11-02')).toBe('2026-11-03');
    expect(dayLabel('2026-11-02')).toBe('First update Nov 3');
    expect(dayLabel('2026-11-02', base)).toBe('First update Nov 3');
    expect(dayLabel('2027-11-30')).toBe('First update Dec 1');
    expect(showsData(base)).toBe(false);
    expect(showsData(undefined)).toBe(false);
  });
  const days = [{ date: '2026-11-04', launched_cumulative: 1, sends: 4, sends_vs_baseline: 0 }];
  it('stays "First update Nov 3" while unpublished, even with data', () => {
    expect(showsData({ ...base, days })).toBe(false);
    expect(dayLabel(base.start, { ...base, days })).toBe('First update Nov 3');
  });
  it('counts days from the start once published with data', () => {
    const t = { ...base, published: true, days };
    expect(showsData(t)).toBe(true);
    expect(dayLabel(t.start, t)).toBe('Day 3 of 29');
    expect(dayLabel(t.start, { ...t, days: [] })).toBe('First update Nov 3');
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
  it('rejects a first mention before start without pre_start', () => {
    const brands = [{ ...ok.brands[0], first_mention: '2026-11-01' }, ok.brands[1]];
    expect(messages({ ...ok, brands }).join()).toMatch(/2026-11-01 is before start 2026-11-02 but pre_start is not true/);
  });
  it('accepts a pre-start first mention back to Oct 19, never earlier', () => {
    const at = (first_mention: string) => [{ ...ok.brands[0], first_mention, pre_start: true }, ok.brands[1]];
    expect(messages({ ...ok, brands: at('2026-11-01') })).toEqual([]);
    expect(messages({ ...ok, brands: at('2026-10-19') })).toEqual([]);
    expect(messages({ ...ok, brands: at('2026-10-18') }).join()).toMatch(/2026-10-18 is before 2026-10-19/);
  });
  it('rejects pre_start on or after start, and any value but true', () => {
    const brands = [{ ...ok.brands[0], pre_start: true }, ok.brands[1]];
    expect(messages({ ...ok, brands }).join()).toMatch(/pre_start is true but 2026-11-02 is on or after start/);
    const f = [{ ...ok.brands[0], pre_start: false }, ok.brands[1]];
    expect(messages({ ...ok, brands: f })).not.toEqual([]);
  });
  it('sorts pre-start rows first, by name, and shows Before Nov 2 as the earliest', () => {
    const b = (brand: string, first_mention: string, pre_start?: true) => ({
      brand, brand_slug: brand.toLowerCase(), first_mention, discount: null, sends_since: 1, avg_score: 20, ...(pre_start ? { pre_start } : {}),
    });
    const brands = [b('CB2', '2026-11-02'), b('Wayfair', '2026-11-01', true), b('QVC', '2026-10-22', true), b('Aerie', '2026-11-03'), b('L.L.Bean', '2026-10-26', true)];
    expect(firstMentionRows(brands).map((x) => x.brand)).toEqual(['L.L.Bean', 'QVC', 'Wayfair', 'CB2', 'Aerie']);
    expect(earliestMention({ start: '2026-11-02', brands })).toEqual({ brand: 'QVC', label: 'Before Nov 2' });
    expect(earliestMention({ start: '2026-11-02', brands: [b('CB2', '2026-11-02')] })).toEqual({ brand: 'CB2', label: 'Nov 2' });
    expect(earliestMention({ start: '2026-11-02', brands: [] })).toBeUndefined();
  });
  it('flags brand slugs that are not in board data', () => {
    expect(unknownTrackerBrands(trackerSchema.parse(ok), ['a', 'c'])).toEqual(['b']);
    expect(unknownTrackerBrands(trackerSchema.parse(ok), ['a', 'b'])).toEqual([]);
  });
});
