// .github/workflows/auto-pr-scope.yml: its step script, run with bash and a
// stub gh that lists the PR's changed files (no network).
import { execFileSync } from 'node:child_process';
import { chmodSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

const workflow = parse(readFileSync(new URL('../.github/workflows/auto-pr-scope.yml', import.meta.url), 'utf8'));
const step = workflow.jobs['auto-pr-scope'].steps[0];

function check(headRef: string, files: string[]): { code: number; out: string } {
  const dir = mkdtempSync(join(tmpdir(), 'scope-'));
  // gh api ... --jq '.[] | .filename, (.previous_filename // empty)': one path per line
  writeFileSync(join(dir, 'gh'), `#!/bin/sh\necho "$*" >> "${dir}/calls"\ncat "${dir}/files"\n`);
  chmodSync(join(dir, 'gh'), 0o755);
  writeFileSync(join(dir, 'files'), files.map((f) => `${f}\n`).join(''));
  try {
    const out = execFileSync('bash', ['-c', step.run], {
      env: { PATH: `${dir}:${process.env.PATH}`, HEAD_REF: headRef, PR_NUMBER: '7', REPO: 'andrewluxem/inboxteardown', GH_TOKEN: 'x' },
      encoding: 'utf8',
    });
    return { code: 0, out };
  } catch (e) {
    const err = e as { status: number; stdout: string };
    return { code: err.status, out: err.stdout };
  }
}

describe('auto-pr-scope workflow', () => {
  it('runs on pull_request', () => {
    expect(Object.keys(workflow.on)).toEqual(['pull_request']);
  });
  it('passes an auto/ PR that changes only boards', () => {
    expect(check('auto/2026-10-16', ['src/content/scoreboard/2026-10-16.md']).code).toBe(0);
  });
  it('fails an auto/ PR that changes anything else, naming each file', () => {
    const r = check('auto/2026-10-16', ['src/content/scoreboard/2026-10-16.md', 'vercel.json', 'src/pages/index.astro']);
    expect(r.code).toBe(1);
    expect(r.out).toContain('::error file=vercel.json::');
    expect(r.out).toContain('::error file=src/pages/index.astro::');
    expect(r.out).not.toContain('file=src/content/scoreboard/');
  });
  it('fails on a rename out of another folder (its old path)', () => {
    expect(check('auto/x', ['src/content/scoreboard/a.md', 'src/content/teardowns/a.md']).code).toBe(1);
  });
  it('fails on a lookalike path', () => {
    expect(check('auto/x', ['src/content/scoreboard-old/a.md']).code).toBe(1);
    expect(check('auto/x', ['src/content/scoreboardx.md']).code).toBe(1);
  });
  it('fails when no files are listed', () => {
    expect(check('auto/x', []).code).toBe(1);
  });
  it('passes every other PR without listing files', () => {
    expect(check('hardening', ['vercel.json']).code).toBe(0);
    expect(check('autopublish/x', ['vercel.json']).code).toBe(0);
  });
});
