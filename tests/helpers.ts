import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import type { Dimensions, Email } from '../src/lib/schemas';
import { DIMENSION_KEYS, type DimensionKey } from '../src/config/rubric';

/** Build a dimensions object with every score set to `base`, then apply overrides. */
export function dims(base: number, overrides: Partial<Record<DimensionKey, number>> = {}): Dimensions {
  return Object.fromEntries(
    DIMENSION_KEYS.map((k) => [k, { score: overrides[k] ?? base, note: 'n', source: 'judgment' as const }]),
  ) as Dimensions;
}

let n = 0;
export function makeEmail(partial: Partial<Email> & { dimensions: Dimensions }): Email {
  n++;
  return {
    id: `test-${n}`,
    brand: `Brand ${n}`,
    brand_slug: `brand-${n}`,
    industry: 'other',
    kind: 'campaign',
    sent_at: new Date('2026-10-06T18:00:00Z'),
    subject: 'Subject',
    preheader: '',
    themes: [],
    checks: [],
    screenshot: null,
    ...partial,
  };
}

/** Parse the YAML frontmatter of a markdown file. */
export function frontmatter(path: string): unknown {
  const src = readFileSync(path, 'utf8');
  const m = src.match(/^---\n([\s\S]*?)\n---/);
  if (!m) throw new Error(`No frontmatter in ${path}`);
  return parse(m[1]!);
}
