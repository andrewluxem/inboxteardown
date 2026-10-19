// Build-time access to content. Cross-file rules that a per-file Zod schema
// cannot express are enforced here and throw, which fails the build.
import { getCollection, getEntry, type CollectionEntry } from 'astro:content';
import { brandSlugs, flatten, summarizeBrand, windowEnd, type FlatEmail } from './brands';
import { fillSiteTokens } from './site-tokens';
import { unknownTrackerBrands } from './tracker';
import type { ScoreboardDay } from './schemas';

let cachedDays: ScoreboardDay[] | undefined;

/** All scoreboard days, oldest first. */
export async function getScoreboardDays(): Promise<ScoreboardDay[]> {
  if (cachedDays) return cachedDays;
  const entries = await getCollection('scoreboard');
  if (!entries.length) throw new Error('No scoreboard files in src/content/scoreboard/');

  const ids = new Map<string, string>();
  for (const entry of entries) {
    if (entry.id !== entry.data.date) {
      throw new Error(`Scoreboard file "${entry.id}.md" has date ${entry.data.date}; the filename must match the date.`);
    }
    for (const e of entry.data.emails) {
      const prev = ids.get(e.id);
      if (prev) throw new Error(`Email id "${e.id}" appears in both ${prev}.md and ${entry.id}.md; ids must be globally unique.`);
      ids.set(e.id, entry.id);
    }
  }
  cachedDays = entries.map((e) => e.data).sort((a, b) => a.date.localeCompare(b.date));
  return cachedDays;
}

export async function getLatestDay(): Promise<ScoreboardDay> {
  return (await getScoreboardDays()).at(-1)!;
}

export async function getAllEmails(): Promise<FlatEmail[]> {
  return flatten(await getScoreboardDays());
}

export async function getWindowEnd(): Promise<string> {
  return windowEnd(await getScoreboardDays());
}

export async function getEmailById(id: string): Promise<FlatEmail | undefined> {
  return (await getAllEmails()).find((e) => e.id === id);
}

export type TeardownEntry = CollectionEntry<'teardowns'>;

export function teardownSlug(entry: TeardownEntry): string {
  return entry.id.replace(/^\d{4}-\d{2}-\d{2}-/, '');
}

/** Teardowns newest first. Drafts are visible in `astro dev` only. */
export async function getTeardowns(): Promise<TeardownEntry[]> {
  const entries = await getCollection('teardowns', (e) => !(import.meta.env.PROD && e.data.draft));
  const emailIds = new Set((await getAllEmails()).map((e) => e.id));
  for (const t of entries) {
    for (const id of t.data.featured_email_ids) {
      if (!emailIds.has(id)) throw new Error(`Teardown "${t.id}" features unknown email id "${id}".`);
    }
  }
  return entries.sort((a, b) => b.data.date.localeCompare(a.data.date) || b.data.number - a.data.number);
}

export const CURRENT_TRACKER = 'black-friday-2026';
/**
 * First day of the current tracker, and the single source for it: the page
 * shows a "Starts" state before this date or until a content file exists, and
 * the current tracker's content file must use the same `start`.
 */
export const CURRENT_TRACKER_START = '2026-11-02';

let cachedTrackers: CollectionEntry<'tracker'>[] | undefined;

export async function getTrackers(): Promise<CollectionEntry<'tracker'>[]> {
  if (cachedTrackers) return cachedTrackers;
  const entries = await getCollection('tracker');
  const boardSlugs = brandSlugs(await getAllEmails());
  for (const t of entries) {
    const unknown = unknownTrackerBrands(t.data, boardSlugs);
    if (unknown.length) {
      throw new Error(`Tracker "${t.id}.md" lists brand_slug ${unknown.map((u) => `"${u}"`).join(', ')}, not in any scoreboard file.`);
    }
    if (t.data.slug === CURRENT_TRACKER && t.data.start !== CURRENT_TRACKER_START) {
      throw new Error(
        `Tracker "${t.id}.md" has start ${t.data.start}; the current tracker starts ${CURRENT_TRACKER_START} (CURRENT_TRACKER_START in src/lib/content.ts).`,
      );
    }
  }
  cachedTrackers = entries;
  return cachedTrackers;
}

export async function getTracker(slug = CURRENT_TRACKER): Promise<CollectionEntry<'tracker'> | undefined> {
  return (await getTrackers()).find((t) => t.data.slug === slug);
}

/** The brands that have a brand page today, by name: the brands we track now. */
export async function getTrackedBrands(): Promise<{ slug: string; name: string }[]> {
  const all = await getAllEmails();
  const end = await getWindowEnd();
  return brandSlugs(all)
    .map((slug) => summarizeBrand(all, slug, end))
    .filter((b) => b !== undefined)
    .map((b) => ({ slug: b.slug, name: b.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getPage(id: string): Promise<CollectionEntry<'pages'>> {
  const entry = await getEntry('pages', id);
  if (!entry) throw new Error(`Page "${id}" not found in src/content/pages/`);
  return entry;
}

/** A markdown page's rendered HTML with site tokens ({contactEmail}, ...) filled from config. */
export async function getPageHtml(id: string): Promise<{ page: CollectionEntry<'pages'>; html: string }> {
  const page = await getPage(id);
  const html = page.rendered?.html;
  if (html === undefined) throw new Error(`Page "${id}" has no rendered HTML.`);
  return { page, html: fillSiteTokens(html) };
}
