import { describe, expect, it } from 'vitest';
import { expectedBoardDate, isBoardLate } from '../src/lib/freshness';

// Oct 2026 is MDT (UTC-6); Nov 2026 after the 1st is MST (UTC-7).
const at = (iso: string) => new Date(iso);

describe('expectedBoardDate', () => {
  it("is yesterday's board before 7:00 am MT", () => {
    expect(expectedBoardDate(at('2026-10-21T12:59:00Z'))).toBe('2026-10-20'); // 6:59 am MDT
  });
  it("is today's board from 7:00 am MT", () => {
    expect(expectedBoardDate(at('2026-10-21T13:00:00Z'))).toBe('2026-10-21'); // 7:00 am MDT
  });
  it('uses the Mountain Time date, not UTC', () => {
    // 11:30 pm MDT Oct 21 is already Oct 22 in UTC.
    expect(expectedBoardDate(at('2026-10-22T05:30:00Z'))).toBe('2026-10-21');
    // 12:30 am MDT Oct 22: before 7, so Oct 21 is still current.
    expect(expectedBoardDate(at('2026-10-22T06:30:00Z'))).toBe('2026-10-21');
  });
  it('follows standard time after the clocks change', () => {
    expect(expectedBoardDate(at('2026-11-03T13:30:00Z'))).toBe('2026-11-02'); // 6:30 am MST
    expect(expectedBoardDate(at('2026-11-03T14:00:00Z'))).toBe('2026-11-03'); // 7:00 am MST
  });
});

describe('isBoardLate', () => {
  it('is not late on the morning a board publishes, or overnight after', () => {
    expect(isBoardLate('2026-10-20', at('2026-10-20T15:00:00Z'))).toBe(false);
    expect(isBoardLate('2026-10-20', at('2026-10-21T08:00:00Z'))).toBe(false); // 2 am MDT Oct 21
  });
  it('is late once the next board is due and missing (the Oct 21 case)', () => {
    expect(isBoardLate('2026-10-20', at('2026-10-21T13:00:00Z'))).toBe(true);
    expect(isBoardLate('2026-10-20', at('2026-10-22T05:30:00Z'))).toBe(true);
  });
  it('stays late across days until a newer board lands', () => {
    expect(isBoardLate('2026-10-17', at('2026-10-19T03:00:00Z'))).toBe(true);
    expect(isBoardLate('2026-10-21', at('2026-10-21T18:00:00Z'))).toBe(false);
  });
});
