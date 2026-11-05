// Brand redirects (src/data/brand-redirects.json) go live one at a time, at
// build time: a redirect is active only when the current content no longer
// builds its source page and does build its destination. So the map can land
// before or after the scorer publishes registry slugs, and no redirect ever
// hides a live page or points at a 404.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { brandPages, flatten, windowEnd } from './brands';
import { brandRedirectsSchema, scoreboardSchema, type BrandRedirects, type ScoreboardDay } from './schemas';

export type Redirect = BrandRedirects['redirects'][number];

export const emailPath = (id: string) => `/email/${id}/`;
export const brandPath = (slug: string) => `/brand/${slug}/`;

/** The /email/ and /brand/ paths the pages under src/pages/ build from these boards. */
export function builtPagePaths(days: ScoreboardDay[]): Set<string> {
  const all = flatten(days);
  return new Set([
    ...all.map((e) => emailPath(e.id)),
    ...brandPages(all, windowEnd(days)).map((b) => brandPath(b.slug)),
  ]);
}

export type SkipReason = 'source page is still built' | 'destination page is not built';

export interface RedirectPlan {
  active: Redirect[];
  skipped: { redirect: Redirect; reasons: SkipReason[] }[];
}

export function planRedirects(redirects: Redirect[], built: Set<string>): RedirectPlan {
  const plan: RedirectPlan = { active: [], skipped: [] };
  for (const redirect of redirects) {
    const reasons: SkipReason[] = [];
    if (built.has(redirect.source)) reasons.push('source page is still built');
    if (!built.has(redirect.destination)) reasons.push('destination page is not built');
    if (reasons.length) plan.skipped.push({ redirect, reasons });
    else plan.active.push(redirect);
  }
  return plan;
}

/** Build log lines: the totals, then a count and the entries for each skip reason. */
export function describePlan(plan: RedirectPlan): string[] {
  const total = plan.active.length + plan.skipped.length;
  const lines = [`${plan.active.length} of ${total} included, ${plan.skipped.length} skipped`];
  for (const r of plan.active) lines.push(`  included: ${r.source} -> ${r.destination}`);
  const byReason = new Map<string, Redirect[]>();
  for (const s of plan.skipped) {
    const key = s.reasons.join(' and ');
    byReason.set(key, [...(byReason.get(key) ?? []), s.redirect]);
  }
  for (const [reason, rs] of byReason) {
    lines.push(`  skipped ${rs.length}: ${reason}`);
    for (const r of rs) lines.push(`    ${r.source} -> ${r.destination}`);
  }
  return lines;
}

export interface VercelRoute {
  src: string;
  headers: { Location: string };
  status: 308;
}

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Build Output API routes for the active redirects: a 308 from the source
 * with or without its trailing slash, straight to the destination. They go
 * first in .vercel/output/config.json, ahead of the adapter's trailing-slash
 * redirect, so an old URL takes one hop.
 */
export function vercelRedirectRoutes(active: Redirect[]): VercelRoute[] {
  return active.map((r) => ({
    src: `^${escapeRegex(r.source.replace(/\/$/, ''))}/?$`,
    headers: { Location: r.destination },
    status: 308,
  }));
}

/** Parse and validate every scoreboard file in `dir`, oldest first. */
export function readBoards(dir: string): ScoreboardDay[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => {
      const m = readFileSync(join(dir, f), 'utf8').match(/^---\r?\n([\s\S]*?)\r?\n---/);
      if (!m) throw new Error(`No frontmatter in ${join(dir, f)}`);
      const r = scoreboardSchema.safeParse(parse(m[1]!));
      if (!r.success) throw new Error(`${join(dir, f)} fails the scoreboard schema: ${r.error.message}`);
      return r.data;
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function readRedirectMap(file: string): Redirect[] {
  const r = brandRedirectsSchema.safeParse(JSON.parse(readFileSync(file, 'utf8')));
  if (!r.success) throw new Error(`${file} fails the brand redirect schema: ${r.error.message}`);
  return r.data.redirects;
}
