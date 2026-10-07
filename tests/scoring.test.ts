import { describe, expect, it } from 'vitest';
import { band, bandFor, bestAndWorst, isCapped, lowestDimension, rank, total } from '../src/lib/scoring';
import { dims, makeEmail } from './helpers';

describe('total', () => {
  it('is the sum of the 8 dimension scores', () => {
    expect(total({ dimensions: dims(3) })).toBe(24);
    expect(total({ dimensions: dims(5) })).toBe(40);
    expect(total({ dimensions: dims(1) })).toBe(8);
    expect(total({ dimensions: dims(4, { subject_preheader: 2, technical_hygiene: 1 }) })).toBe(27);
  });
});

describe('isCapped', () => {
  it('caps when trust is 1', () => {
    expect(isCapped({ dimensions: dims(5, { trust: 1 }) })).toBe(true);
  });
  it('caps when technical_hygiene is 1', () => {
    expect(isCapped({ dimensions: dims(5, { technical_hygiene: 1 }) })).toBe(true);
  });
  it('does not cap when trust and technical_hygiene are both 2 or higher', () => {
    expect(isCapped({ dimensions: dims(2) })).toBe(false);
    expect(isCapped({ dimensions: dims(5, { trust: 2, technical_hygiene: 2 }) })).toBe(false);
  });
  it('does not cap for a 1 on any other dimension', () => {
    expect(isCapped({ dimensions: dims(4, { personalization: 1, subject_preheader: 1 }) })).toBe(false);
  });
});

describe('band thresholds', () => {
  it('23 is weak, 24 is solid', () => {
    expect(bandFor(23, false)).toBe('weak');
    expect(bandFor(24, false)).toBe('solid');
  });
  it('32 is solid, 33 is strong', () => {
    expect(bandFor(32, false)).toBe('solid');
    expect(bandFor(33, false)).toBe('strong');
  });
  it('capped overrides any total', () => {
    expect(bandFor(39, true)).toBe('capped');
    expect(band({ dimensions: dims(5, { trust: 1 }) })).toBe('capped');
  });
  it('derives band from real dimension totals', () => {
    expect(band({ dimensions: dims(3, { cta: 2 }) })).toBe('weak'); // 23
    expect(band({ dimensions: dims(3) })).toBe('solid'); // 24
    expect(band({ dimensions: dims(4) })).toBe('solid'); // 32
    expect(band({ dimensions: dims(4, { cta: 5 }) })).toBe('strong'); // 33
  });
});

describe('rank', () => {
  it('puts every capped email after every non-capped email', () => {
    const highCapped = makeEmail({ dimensions: dims(5, { technical_hygiene: 1 }) }); // 36, capped
    const low = makeEmail({ dimensions: dims(2) }); // 16
    const mid = makeEmail({ dimensions: dims(3) }); // 24
    const lowCapped = makeEmail({ dimensions: dims(3, { trust: 1 }) }); // 22, capped
    const ranked = rank([highCapped, low, lowCapped, mid]).map((s) => s.email.id);
    expect(ranked).toEqual([mid.id, low.id, highCapped.id, lowCapped.id]);
  });
  it('orders by total descending within each group', () => {
    const a = makeEmail({ dimensions: dims(4) });
    const b = makeEmail({ dimensions: dims(5) });
    expect(rank([a, b]).map((s) => s.total)).toEqual([40, 32]);
  });
});

describe('bestAndWorst', () => {
  it('best is the top non-capped campaign; worst is the first capped email', () => {
    const welcome = makeEmail({ kind: 'welcome', dimensions: dims(5) });
    const best = makeEmail({ dimensions: dims(4) });
    const capped = makeEmail({ dimensions: dims(5, { technical_hygiene: 1 }) });
    const r = bestAndWorst([welcome, best, capped]);
    expect(r.best?.email.id).toBe(best.id);
    expect(r.worst?.email.id).toBe(capped.id);
    expect(r.worstIsCap).toBe(true);
  });
  it('falls back to the lowest campaign when nothing is capped', () => {
    const hi = makeEmail({ dimensions: dims(4) });
    const lo = makeEmail({ dimensions: dims(2) });
    const r = bestAndWorst([lo, hi]);
    expect(r.worst?.email.id).toBe(lo.id);
    expect(r.worstIsCap).toBe(false);
  });
});

describe('lowestDimension', () => {
  it('returns the lowest-scoring dimension, ties in rubric order', () => {
    expect(lowestDimension({ dimensions: dims(4, { cta: 2 }) })).toBe('cta');
    expect(lowestDimension({ dimensions: dims(3) })).toBe('subject_preheader');
  });
});
