import { describe, expect, it } from 'vitest';
import { blackFridayDates, launchGrid } from '../src/lib/tracker';

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
