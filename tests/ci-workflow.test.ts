// .github/workflows/ci.yml: the steps it runs, and its prelaunch gate run with
// bash and a stub npm that prints a canned prelaunch report.
import { execFileSync } from 'node:child_process';
import { chmodSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

const workflow = parse(readFileSync(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8'));
const steps: { run?: string; name?: string }[] = workflow.jobs.ci.steps;
const gate = steps.find((s) => s.name?.startsWith('prelaunch'))!;

const report = (fails: string[]) =>
  `Prelaunch check: 196 pages, 59 source files\n\nPASS  Privacy page is built\n${fails.map((f) => `FAIL  ${f} (1)\n        detail\n`).join('')}`;
const SIGNUP = 'PUBLIC_SIGNUP_ENDPOINT set at build time';

function runGate(output: string, exit: number): { code: number; out: string } {
  const dir = mkdtempSync(join(tmpdir(), 'ci-'));
  writeFileSync(join(dir, 'report'), output);
  writeFileSync(join(dir, 'npm'), `#!/bin/sh\ncat "${dir}/report"\nexit ${exit}\n`);
  chmodSync(join(dir, 'npm'), 0o755);
  try {
    return { code: 0, out: execFileSync('bash', ['-c', gate.run!], { cwd: dir, env: { PATH: `${dir}:${process.env.PATH}` }, encoding: 'utf8' }) };
  } catch (e) {
    const err = e as { status: number; stdout: string };
    return { code: err.status, out: err.stdout };
  }
}

describe('ci workflow', () => {
  it('runs on every pull_request as the "ci" job', () => {
    expect(Object.keys(workflow.on)).toEqual(['pull_request']);
    expect(Object.keys(workflow.jobs)).toEqual(['ci']);
  });
  it('runs npm ci, vitest, astro check, build and prelaunch in order', () => {
    expect(steps.map((s) => s.run?.split('\n')[0]).filter(Boolean)).toEqual([
      'npm ci', 'npx vitest run', 'npx astro check', 'npm run build', 'set -uo pipefail',
    ]);
    expect(gate.run).toContain('npm run prelaunch');
  });
  it('passes when prelaunch passes or fails only on the signup endpoint', () => {
    expect(runGate(report([]), 0).code).toBe(0);
    expect(runGate(report([SIGNUP]), 1).code).toBe(0);
  });
  it('fails on any other failed rule, with or without the signup one', () => {
    const r = runGate(report([SIGNUP, 'Every inline script is allowed by the vercel.json CSP']), 1);
    expect(r.code).toBe(1);
    expect(r.out).toContain('::error::prelaunch: FAIL  Every inline script');
    expect(runGate(report(['robots.txt allows crawling']), 1).code).toBe(1);
  });
  it('fails when prelaunch crashes or exits nonzero with no failed rule', () => {
    expect(runGate('No dist/ directory. Run `npm run build` first.\n', 1).code).toBe(1);
    expect(runGate(report([]), 1).code).toBe(1);
  });
});
