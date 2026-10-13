import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { CHECK_LABELS, checkLabel } from '../src/lib/checks';

const root = new URL('../', import.meta.url);

/** The "Check" column of the methodology ceiling table, backticks removed. */
function methodologyCheckCells(): string[] {
  const md = readFileSync(new URL('src/content/pages/methodology.md', root), 'utf8');
  const lines = md.split('\n');
  const start = lines.findIndex((l) => /^\|\s*Check\s*\|/.test(l));
  expect(start, 'methodology ceiling table not found').toBeGreaterThan(-1);
  const rows = [];
  for (const line of lines.slice(start + 2)) {
    if (!line.startsWith('|')) break;
    rows.push(line.split('|')[1]!.trim().replace(/`/g, ''));
  }
  return rows;
}

/** Every check name used in the scoreboard content files. */
function fixtureCheckNames(): string[] {
  const dir = new URL('src/content/scoreboard/', root);
  const names = new Set<string>();
  for (const f of readdirSync(dir).filter((f) => f.endsWith('.md'))) {
    const fm = parse(readFileSync(new URL(f, dir), 'utf8').split(/^---$/m)[1] ?? '');
    for (const e of fm?.emails ?? []) for (const c of e.checks ?? []) names.add(c.name);
  }
  return [...names];
}

describe('check labels', () => {
  it('maps known names and falls back to the raw name', () => {
    expect(checkLabel('secondary_links_resolve')).toBe('Other links in the email are broken');
    expect(checkLabel('some_new_check')).toBe('some_new_check');
  });

  it('has a check name for every row of the methodology ceiling table', () => {
    const labels = new Set(Object.values(CHECK_LABELS));
    const cells = methodologyCheckCells();
    expect(cells.length).toBeGreaterThan(10);
    expect(cells.filter((c) => !labels.has(c))).toEqual([]);
  });

  it('has a label for every check name in the current content', () => {
    const names = fixtureCheckNames();
    expect(names.length).toBeGreaterThan(0);
    expect(names.filter((n) => !(n in CHECK_LABELS))).toEqual([]);
  });
});
