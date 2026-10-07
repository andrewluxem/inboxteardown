// Everything derived from dimension scores. None of these values are stored in
// content; the pipeline writes raw dimension scores only.
import { BANDS, CAPPING_DIMENSIONS, DIMENSION_KEYS, type Band, type DimensionKey } from '../config/rubric';
import type { Dimensions, Email } from './schemas';

type HasDimensions = { dimensions: Dimensions };

export function total(e: HasDimensions): number {
  return DIMENSION_KEYS.reduce((sum, k) => sum + e.dimensions[k].score, 0);
}

export function isCapped(e: HasDimensions): boolean {
  return CAPPING_DIMENSIONS.some((k) => e.dimensions[k].score === 1);
}

export function bandFor(totalScore: number, capped: boolean): Band {
  if (capped) return 'capped';
  if (totalScore >= BANDS.strong.min) return 'strong';
  if (totalScore >= BANDS.solid.min) return 'solid';
  return 'weak';
}

export function band(e: HasDimensions): Band {
  return bandFor(total(e), isCapped(e));
}

/** The dimension that dragged the email down most; ties go to rubric order. */
export function lowestDimension(e: HasDimensions): DimensionKey {
  return DIMENSION_KEYS.reduce((lo, k) => (e.dimensions[k].score < e.dimensions[lo].score ? k : lo));
}

/** The dimension responsible for a cap, if any (trust before technical_hygiene). */
export function cappingDimension(e: HasDimensions): DimensionKey | undefined {
  return CAPPING_DIMENSIONS.find((k) => e.dimensions[k].score === 1);
}

export function hasFailedCheck(e: Pick<Email, 'checks'>): boolean {
  return e.checks.some((c) => c.result === 'fail');
}

export interface Scored<T> {
  email: T;
  total: number;
  capped: boolean;
  band: Band;
}

export function score<T extends HasDimensions>(e: T): Scored<T> {
  const t = total(e);
  const capped = isCapped(e);
  return { email: e, total: t, capped, band: bandFor(t, capped) };
}

/**
 * Leaderboard order: every non-capped email first by total descending, then
 * capped emails by total descending. Ties break on brand, then id, so the
 * order is stable across builds.
 */
export function rank<T extends HasDimensions & { brand: string; id: string }>(emails: T[]): Scored<T>[] {
  return emails.map(score).sort((a, b) => {
    if (a.capped !== b.capped) return a.capped ? 1 : -1;
    if (a.total !== b.total) return b.total - a.total;
    return a.email.brand.localeCompare(b.email.brand) || a.email.id.localeCompare(b.email.id);
  });
}

export interface BestWorst<T> {
  best?: Scored<T>;
  worst?: Scored<T>;
  worstIsCap: boolean;
}

/**
 * Best: highest total among non-capped campaigns. Worst: the first capped
 * email in leaderboard order, or failing that the lowest-scoring campaign.
 */
export function bestAndWorst<T extends HasDimensions & { brand: string; id: string; kind: string }>(
  emails: T[],
): BestWorst<T> {
  const ranked = rank(emails);
  const campaigns = ranked.filter((s) => s.email.kind === 'campaign');
  const best = campaigns.find((s) => !s.capped);
  const cap = ranked.find((s) => s.capped);
  if (cap) return { best, worst: cap, worstIsCap: true };
  const uncappedCampaigns = campaigns.filter((s) => !s.capped);
  const worst = uncappedCampaigns[uncappedCampaigns.length - 1];
  return { best, worst: worst === best && uncappedCampaigns.length < 2 ? undefined : worst, worstIsCap: false };
}

export function average(nums: number[]): number {
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
}

export function median(nums: number[]): number | undefined {
  if (!nums.length) return undefined;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1]! + s[mid]!) / 2;
}
