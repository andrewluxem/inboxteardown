import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { scoreboardSchema, teardownSchema, trackerSchema } from '../src/lib/schemas';
import { frontmatter } from './helpers';

const root = join(import.meta.dirname, '..');
const content = (dir: string) => join(root, 'src/content', dir);
const mdFiles = (dir: string) => readdirSync(content(dir)).filter((f) => f.endsWith('.md'));

function issuePaths(result: { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } }): string[] {
  return (result.error?.issues ?? []).map((i) => i.path.join('.'));
}

describe('content schemas accept the fixtures', () => {
  it.each(mdFiles('scoreboard'))('scoreboard/%s', (f) => {
    const r = scoreboardSchema.safeParse(frontmatter(join(content('scoreboard'), f)));
    expect(r.error?.issues ?? []).toEqual([]);
  });
  it.each(mdFiles('teardowns'))('teardowns/%s', (f) => {
    expect(teardownSchema.safeParse(frontmatter(join(content('teardowns'), f))).success).toBe(true);
  });
  it.each(mdFiles('tracker'))('tracker/%s', (f) => {
    expect(trackerSchema.safeParse(frontmatter(join(content('tracker'), f))).success).toBe(true);
  });
});

describe('content schemas reject a malformed scoreboard', () => {
  const bad = frontmatter(join(import.meta.dirname, 'fixtures/malformed-scoreboard.md'));
  const result = scoreboardSchema.safeParse(bad);
  const paths = issuePaths(result);

  it('fails validation', () => {
    expect(result.success).toBe(false);
  });
  it('flags the missing eighth dimension', () => {
    expect(paths).toContain('emails.0.dimensions.technical_hygiene');
  });
  it('flags a score of 6', () => {
    expect(paths).toContain('emails.0.dimensions.cta.score');
  });
  it('flags an unknown industry', () => {
    expect(paths).toContain('emails.0.industry');
  });
});

describe('content schemas reject other contract violations', () => {
  const good = frontmatter(join(content('scoreboard'), mdFiles('scoreboard')[0]!)) as {
    emails: Record<string, unknown>[];
  };
  const withEmail = (patch: Record<string, unknown>) => ({ ...good, emails: [{ ...good.emails[0], ...patch }] });

  it('rejects a non-integer score', () => {
    const e = good.emails[0] as { dimensions: Record<string, Record<string, unknown>> };
    const r = scoreboardSchema.safeParse(withEmail({ dimensions: { ...e.dimensions, cta: { ...e.dimensions.cta, score: 3.5 } } }));
    expect(r.success).toBe(false);
  });
  it('rejects an unknown dimension key', () => {
    const e = good.emails[0] as { dimensions: Record<string, unknown> };
    const r = scoreboardSchema.safeParse(withEmail({ dimensions: { ...e.dimensions, vibes: e.dimensions.cta } }));
    expect(r.success).toBe(false);
  });
  it('rejects a non URL-safe id', () => {
    expect(scoreboardSchema.safeParse(withEmail({ id: 'Has Spaces' })).success).toBe(false);
  });
  it('rejects an unknown kind', () => {
    expect(scoreboardSchema.safeParse(withEmail({ kind: 'newsletter' })).success).toBe(false);
  });
  it('rejects duplicate ids within a file', () => {
    expect(scoreboardSchema.safeParse({ ...good, emails: [good.emails[0], good.emails[0]] }).success).toBe(false);
  });
});
