// End to end with tests/fixtures/tracker/black-friday-2026.md (published:
// false): it passes the schema and the board check, the auto-pr-scope step
// accepts its real path, and a build of a throwaway repo copy with the file in
// place renders the preview: banner, noindex, no nav or sitemap entry.
import { execFileSync } from 'node:child_process';
import { chmodSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { scoreboardSchema, trackerSchema, type Tracker } from '../src/lib/schemas';
import { unknownTrackerBrands } from '../src/lib/tracker';
import { frontmatter } from './helpers';

const ROOT = new URL('..', import.meta.url).pathname;
const FIXTURE = join(ROOT, 'tests/fixtures/tracker/black-friday-2026.md');
const TARGET = 'src/content/tracker/black-friday-2026.md';

const boardSlugs = readdirSync(join(ROOT, 'src/content/scoreboard'))
  .filter((f) => f.endsWith('.md'))
  .flatMap((f) => scoreboardSchema.parse(frontmatter(join(ROOT, 'src/content/scoreboard', f))).emails.map((e) => e.brand_slug));

describe('tracker fixture', () => {
  const t: Tracker = trackerSchema.parse(frontmatter(FIXTURE));

  it('is unpublished and valid, with every brand in board data', () => {
    expect(t.published).toBe(false);
    expect(unknownTrackerBrands(t, boardSlugs)).toEqual([]);
  });

  it('passes the auto-pr-scope step at its real path', () => {
    const step = parse(readFileSync(join(ROOT, '.github/workflows/auto-pr-scope.yml'), 'utf8')).jobs['auto-pr-scope'].steps[0];
    const dir = mkdtempSync(join(tmpdir(), 'scope-'));
    writeFileSync(join(dir, 'gh'), `#!/bin/sh\necho ${TARGET}\n`);
    chmodSync(join(dir, 'gh'), 0o755);
    const out = execFileSync('bash', ['-c', step.run], {
      env: { PATH: `${dir}:${process.env.PATH}`, HEAD_REF: 'auto/2026-11-04', PR_NUMBER: '1', REPO: 'x/y', GH_TOKEN: 'x' },
      encoding: 'utf8',
    });
    expect(out).toContain('all 1 changed files');
  });
});

describe('build with the fixture in place', () => {
  let dist = '';
  const read = (p: string) => readFileSync(join(dist, p), 'utf8');

  // The copy lives under the repo's .tmp/ (gitignored) so it resolves
  // packages from the repo's node_modules; a symlinked node_modules breaks
  // Vite's .astro compilation.
  let copy = '';
  beforeAll(() => {
    mkdirSync(join(ROOT, '.tmp'), { recursive: true });
    copy = mkdtempSync(join(ROOT, '.tmp', 'tracker-build-'));
    for (const entry of ['astro.config.mjs', 'package.json', 'tsconfig.json', 'public', 'src']) {
      cpSync(join(ROOT, entry), join(copy, entry), { recursive: true });
    }
    cpSync(FIXTURE, join(copy, TARGET));
    execFileSync(join(ROOT, 'node_modules/.bin/astro'), ['build'], { cwd: copy, stdio: 'pipe' });
    dist = join(copy, 'dist');
  }, 180_000);
  afterAll(() => {
    if (copy) rmSync(copy, { recursive: true, force: true });
  });

  it('renders the live tracker as a noindex preview with the banner', () => {
    const html = read('tracker/black-friday-2026/index.html');
    expect(html).toContain('Preview, not public.');
    expect(html).toMatch(/<meta name="robots" content="noindex, nofollow"/);
    expect(html).toContain('Day 3 of 29');
    expect(html).toContain('3 of 4');
  });

  it('keeps it out of the sitemap, the nav and the home page', () => {
    expect(read('sitemap-0.xml')).not.toContain('/tracker/');
    expect(read('index.html')).not.toContain('/tracker/black-friday-2026/');
    expect(read('methodology/index.html')).not.toContain('/tracker/black-friday-2026/');
  });

  it("gives each signup form its own page as the hidden source", () => {
    expect(read('index.html')).toMatch(/<input type="hidden" name="source" value="\/"/);
    expect(read('watchlist/index.html')).toMatch(/<input type="hidden" name="source" value="\/watchlist\/"/);
  });

  it('builds the tracker OG image', () => {
    expect(existsSync(join(dist, 'og/tracker/black-friday-2026.png'))).toBe(true);
  });
});
