import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { builtPagePaths, planRedirects, readBoards, readRedirectMap, vercelRedirectRoutes, type Redirect } from '../src/lib/redirects';
import type { ScoreboardDay } from '../src/lib/schemas';

const root = join(import.meta.dirname, '..');
const map = readRedirectMap(join(root, 'src/data/brand-redirects.json'));
// SCOREBOARD_DIR points the content checks at another copy of the boards,
// such as a scorer export not yet published.
const today = readBoards(process.env.SCOREBOARD_DIR ?? join(root, 'src/content/scoreboard'));
const { aliases } = JSON.parse(readFileSync(join(import.meta.dirname, 'fixtures/brand-registry-aliases.json'), 'utf8')) as {
  aliases: Record<string, string>;
};

const SITE_ID = /^(\d{4}-\d{2}-\d{2})-(.+)-(\d+)$/;

/**
 * Today's boards as the scorer's exporter will publish them with registry
 * brands: an aliased brand_slug becomes its registry slug, an email whose
 * slug did not change keeps its id, and the others take the next free number
 * of their brand for that day, in send order (brands.py assign_ids).
 */
function registryBoards(days: ScoreboardDay[]): ScoreboardDay[] {
  return days.map((day) => {
    const emails = day.emails.map((e) => ({ ...e, brand_slug: aliases[e.brand_slug] ?? e.brand_slug }));
    const used = new Map<string, Set<number>>();
    const taken = (key: string) => used.get(key) ?? used.set(key, new Set()).get(key)!;
    const rest: typeof emails = [];
    for (const e of emails) {
      const m = e.id.match(SITE_ID)!;
      if (m[2] === e.brand_slug) taken(`${m[1]}-${e.brand_slug}`).add(Number(m[3]));
      else rest.push(e);
    }
    const byOld = new Map<string, string>();
    rest
      .sort((a, b) => a.sent_at.getTime() - b.sent_at.getTime() || a.id.localeCompare(b.id))
      .forEach((e) => {
        const key = `${e.id.match(SITE_ID)![1]}-${e.brand_slug}`;
        const nums = taken(key);
        let n = 1;
        while (nums.has(n)) n++;
        nums.add(n);
        byOld.set(e.id, `${key}-${n}`);
      });
    return { ...day, emails: emails.map((e) => ({ ...e, id: byOld.get(e.id) ?? e.id })) };
  });
}

describe('brand redirects with the boards in src/content/scoreboard', () => {
  // These boards change every night and pass through a mix of old and
  // registry slugs, so check what must hold for any content, not a count.
  const built = builtPagePaths(today);
  const plan = planRedirects(map, built);
  const sources = new Set(map.map((r: Redirect) => r.source));

  it('accounts for every map entry once', () => {
    expect([...plan.active, ...plan.skipped.map((s) => s.redirect)]).toHaveLength(map.length);
  });

  it('activates only entries whose source is gone and destination is built', () => {
    expect(plan.active.filter((r) => built.has(r.source) || !built.has(r.destination))).toEqual([]);
  });

  it('skips only entries whose source is built or destination is missing, with the matching reasons', () => {
    for (const { redirect, reasons } of plan.skipped) {
      const expected = [
        ...(built.has(redirect.source) ? ['source page is still built'] : []),
        ...(built.has(redirect.destination) ? [] : ['destination page is not built']),
      ];
      expect(expected).not.toEqual([]);
      expect(reasons).toEqual(expected);
    }
  });

  it('has no entry that points to another entry', () => {
    expect(map.filter((r) => sources.has(r.destination))).toEqual([]);
  });
});

describe('brand redirects with registry-slug boards', () => {
  const boards = registryBoards(today);
  const built = builtPagePaths(boards);
  const plan = planRedirects(map, built);
  const sources = new Set(map.map((r: Redirect) => r.source));

  it('builds boards with globally unique ids', () => {
    const ids = boards.flatMap((d) => d.emails.map((e) => e.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('activates every map entry', () => {
    expect(plan.skipped).toEqual([]);
    expect(plan.active).toEqual(map);
  });

  it('has no redirect that points to another redirect', () => {
    expect(plan.active.filter((r) => sources.has(r.destination))).toEqual([]);
  });

  it('has no destination that 404s', () => {
    expect(plan.active.filter((r) => !built.has(r.destination))).toEqual([]);
  });

  it('redirects no page that is still built', () => {
    expect(plan.active.filter((r) => built.has(r.source))).toEqual([]);
  });
});

describe('planRedirects', () => {
  const r = (source: string, destination: string): Redirect => ({ source, destination, permanent: true });

  it('skips an entry whose destination is not built, and says why', () => {
    const plan = planRedirects([r('/brand/a-b/', '/brand/a/')], new Set());
    expect(plan.active).toEqual([]);
    expect(plan.skipped).toEqual([{ redirect: r('/brand/a-b/', '/brand/a/'), reasons: ['destination page is not built'] }]);
  });

  it('activates only the entries whose source is gone and destination is built', () => {
    const plan = planRedirects(
      [r('/brand/a-b/', '/brand/a/'), r('/brand/c-d/', '/brand/c/')],
      new Set(['/brand/a/', '/brand/c-d/', '/brand/c/']),
    );
    expect(plan.active).toEqual([r('/brand/a-b/', '/brand/a/')]);
    expect(plan.skipped.map((s) => s.reasons)).toEqual([['source page is still built']]);
  });
});

describe('vercelRedirectRoutes', () => {
  const [route] = vercelRedirectRoutes([{ source: '/email/2026-10-15-dicks-clearance-1/', destination: '/email/2026-10-15-dicks-sporting-goods-1/', permanent: true }]);
  const re = new RegExp(route!.src);

  it('is a 308 to the destination', () => {
    expect(route).toMatchObject({ status: 308, headers: { Location: '/email/2026-10-15-dicks-sporting-goods-1/' } });
  });
  it('matches the source with and without its trailing slash', () => {
    expect(re.test('/email/2026-10-15-dicks-clearance-1/')).toBe(true);
    expect(re.test('/email/2026-10-15-dicks-clearance-1')).toBe(true);
  });
  it('matches nothing else', () => {
    expect(re.test('/email/2026-10-15-dicks-clearance-10/')).toBe(false);
    expect(re.test('/email/2026-10-15-dicks-clearance-1/x/')).toBe(false);
    expect(re.test('/x/email/2026-10-15-dicks-clearance-1/')).toBe(false);
  });
});
