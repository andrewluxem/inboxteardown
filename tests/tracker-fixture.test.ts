// End to end with tests/fixtures/tracker/black-friday-2026.md (published:
// false): it passes the schema and the board check, the auto-pr-scope step
// accepts its real path, and a build of a throwaway repo copy with the file in
// place keeps the page public (no noindex, in the sitemap and nav, linked from
// the home page) and shows the pre-start state with none of the file's data.
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

  it('has no noindex meta and no preview banner', () => {
    const html = read('tracker/black-friday-2026/index.html');
    expect(html).not.toMatch(/<meta name="robots"[^>]*noindex/);
    expect(html).not.toContain('Preview, not public');
  });

  it('is in the sitemap and linked from the nav and the home page', () => {
    expect(read('sitemap-0.xml')).toContain('<loc>https://www.inboxteardown.com/tracker/black-friday-2026/</loc>');
    const nav = (path: string) => read(path).match(/<nav class="nav-desktop"[\s\S]*?<\/nav>/)?.[0] ?? '';
    for (const page of ['tracker/black-friday-2026/index.html', 'methodology/index.html', 'index.html']) {
      expect(nav(page), page).toContain('href="/tracker/black-friday-2026/"');
    }
    expect(read('index.html')).toContain('See the tracker');
  });

  it('renders the pre-start state and none of the unpublished data', () => {
    const html = read('tracker/black-friday-2026/index.html');
    expect(html).toContain('Starts <span');
    expect(html).toContain('name="list" value="bfcm"');
    for (const leak of ['Day 3', 'Day 0', '3 of 4', 'First mentions']) expect(html, leak).not.toContain(leak);
    expect(read('index.html')).not.toContain('Day 3 of 29');
  });

  it("gives each signup form its own page as the hidden source", () => {
    expect(read('index.html')).toMatch(/<input type="hidden" name="source" value="\/"/);
    expect(read('watchlist/index.html')).toMatch(/<input type="hidden" name="source" value="\/watchlist\/"/);
  });

  it('builds the tracker OG image', () => {
    expect(existsSync(join(dist, 'og/tracker/black-friday-2026.png'))).toBe(true);
  });
});
