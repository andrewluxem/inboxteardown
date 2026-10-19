import { describe, expect, it } from 'vitest';
import type { Tracker } from '../src/lib/schemas';
import { blackFridayDates, dayLabel, hasStarted, launchGrid } from '../src/lib/tracker';

describe('Black Friday dates', () => {
  it('is the day after the fourth Thursday of November, with Cyber Monday 3 days later', () => {
    expect(blackFridayDates(2026)).toEqual({ bf: '2026-11-27', cm: '2026-11-30' });
    expect(blackFridayDates(2025)).toEqual({ bf: '2025-11-28', cm: '2025-12-01' });
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
    expect(hasStarted(base)).toBe(false);
    expect(hasStarted(undefined)).toBe(false);
  });
  it('counts days from the start once there is data', () => {
    const t = { ...base, days: [{ date: '2026-11-04', launched_cumulative: 1, sends: 4, sends_vs_baseline: 0 }] };
    expect(hasStarted(t)).toBe(true);
    expect(dayLabel(t.start, t)).toBe('Day 3 of 29');
  });
});
