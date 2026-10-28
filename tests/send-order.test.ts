import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { flatten } from '../src/lib/brands';
import { scoreboardSchema, type ScoreboardDay } from '../src/lib/schemas';
import { boardSiblings, ordinal, sendOrdinal, sendTime } from '../src/lib/sends';
import { dims, frontmatter, makeEmail } from './helpers';

describe('ordinal', () => {
  it.each([
    [1, '1st'], [2, '2nd'], [3, '3rd'], [4, '4th'], [11, '11th'], [12, '12th'],
    [13, '13th'], [21, '21st'], [22, '22nd'], [23, '23rd'], [101, '101st'], [111, '111th'],
  ])('%i -> %s', (n, want) => expect(ordinal(n)).toBe(want));
});

describe('sendOrdinal', () => {
  it('labels a brand with several sends', () => {
    expect(sendOrdinal({ send_index: 2, send_count: 3 })).toBe('2nd of 3');
  });
  it('shows nothing for a brand with one send', () => {
    expect(sendOrdinal({ send_index: 1, send_count: 1 })).toBeUndefined();
  });
  it('shows nothing on a board exported without send order', () => {
    expect(sendOrdinal({})).toBeUndefined();
  });
});

describe('sendTime', () => {
  it('uses sent_at_local when set, else sent_at', () => {
    const sent_at = new Date('2026-10-26T20:14:00Z');
    expect(sendTime({ sent_at, sent_at_local: '2026-10-26T14:14:00-06:00' }).getTime()).toBe(sent_at.getTime());
    expect(sendTime({ sent_at })).toBe(sent_at);
  });
});

function board(emails: ReturnType<typeof makeEmail>[]): ScoreboardDay {
  return { date: '2026-10-27', generated_at: new Date('2026-10-27T13:00:00Z'), rubric_version: '1.0', emails };
}

describe('boardSiblings', () => {
  const ev = (i: number, n: number) =>
    makeEmail({ dimensions: dims(3), brand_slug: 'everlane', brand: 'Everlane', send_index: i, send_count: n });
  it('lists the brand sends on the same board in send order, filters aside', () => {
    const a = ev(3, 3), b = ev(1, 3), c = ev(2, 3);
    const other = makeEmail({ dimensions: dims(3), send_index: 1, send_count: 1 });
    const flat = flatten([board([a, b, c, other])]);
    const mid = flat.find((e) => e.id === c.id)!;
    expect(boardSiblings(flat, mid).map((e) => e.id)).toEqual([b.id, c.id, a.id]);
    expect(boardSiblings(flat, flat.find((e) => e.id === other.id)!)).toEqual([]);
  });
  it('does not mix in the same brand from another board', () => {
    const today = flatten([board([ev(1, 2), ev(2, 2)])]);
    const yday = flatten([{ ...board([ev(1, 2), ev(2, 2)]), date: '2026-10-26' }]);
    expect(boardSiblings([...today, ...yday], today[0]!)).toHaveLength(2);
  });
});

describe('scoreboard schema: send order', () => {
  const root = join(import.meta.dirname, '..', 'src/content/scoreboard');
  const good = frontmatter(join(root, readdirSync(root).filter((f) => f.endsWith('.md'))[0]!)) as {
    emails: Record<string, unknown>[];
  };
  const base = good.emails[0]!;
  const day = (rows: [string, Record<string, unknown>][]) => ({
    ...good,
    emails: rows.map(([slug, extra], i) => ({ ...base, id: `e-${i}`, brand_slug: slug, ...extra })),
  });
  const ok = (i: number, n: number) => ({ send_index: i, send_count: n, sent_at_local: '2026-10-26T14:14:00-06:00' });
  const messages = (v: unknown) => (scoreboardSchema.safeParse(v).error?.issues ?? []).map((i) => i.message).join('\n');

  it('accepts old boards without the fields', () => {
    expect(messages(day([['a', {}], ['a', {}]]))).toBe('');
  });
  it('accepts a consistently ordered board and keeps sent_at_local as written', () => {
    const r = scoreboardSchema.safeParse(day([['a', ok(2, 2)], ['a', ok(1, 2)], ['b', ok(1, 1)]]));
    expect(r.error?.issues ?? []).toEqual([]);
    expect(r.data!.emails[0]!.sent_at_local).toBe('2026-10-26T14:14:00-06:00');
  });
  it.each([
    [[['a', ok(1, 2)], ['a', {}]], 'send_index on 1 of its 2 emails'],
    [[['a', ok(1, 2)], ['a', ok(1, 2)]], 'send_index must be 1..2'],
    [[['a', ok(1, 3)], ['a', ok(2, 3)]], 'brand a has 2 email(s)'],
    [[['a', ok(2, 1)]], 'is more than send_count 1'],
    [[['a', { send_index: 1 }]], 'go together'],
    [[['a', { ...ok(1, 1), sent_at_local: '2026-10-26T14:14:00' }]], 'with an offset'],
    [[['a', { sent_at_local: '2026-10-26T14:14:00-06:00' }]], 'only with send_index'],
  ] as [[string, Record<string, unknown>][], string][])('refuses %j', (rows, want) => {
    expect(messages(day(rows))).toContain(want);
  });
});
