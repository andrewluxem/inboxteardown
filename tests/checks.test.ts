import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { PUBLIC_CHECK_NAMES, isPublicCheckName } from '../src/lib/checks';

const root = new URL('../', import.meta.url);

/** Every check name used in the scoreboard content files. */
function contentCheckNames(): string[] {
  const dir = new URL('src/content/scoreboard/', root);
  const names = new Set<string>();
  for (const f of readdirSync(dir).filter((f) => f.endsWith('.md'))) {
    const fm = parse(readFileSync(new URL(f, dir), 'utf8').split(/^---$/m)[1] ?? '');
    for (const e of fm?.emails ?? []) for (const c of e.checks ?? []) names.add(c.name);
  }
  return [...names];
}

describe('check names', () => {
  it('uses only the public check names in the content', () => {
    const names = contentCheckNames();
    expect(names.length).toBeGreaterThan(0);
    expect(names.filter((n) => !isPublicCheckName(n))).toEqual([]);
  });

  it('rejects scorer ids and failure-style labels', () => {
    expect(isPublicCheckName('DMARC alignment')).toBe(true);
    expect(isPublicCheckName('dmarc_aligned')).toBe(false);
    expect(isPublicCheckName('The sender fails DMARC alignment')).toBe(false);
  });

  // A name sits next to PASS and NOT VERIFIED too, so it may not describe a failure.
  it('has no public name that reads as a failure', () => {
    const failure = /\b(fails?|failed|broken|no|not|lacks?|missing|without|over|smaller|below|wider|unfilled|compete)\b/i;
    expect(PUBLIC_CHECK_NAMES.filter((n) => failure.test(n))).toEqual([]);
  });

  it('names no sender authentication other than DMARC', () => {
    expect(PUBLIC_CHECK_NAMES.filter((n) => /\b(SPF|DKIM)\b/.test(n))).toEqual([]);
  });
});
