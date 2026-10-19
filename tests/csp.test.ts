import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { checkCspHashes, cspFromVercelJson, cspSources, inlineScriptHashes } from '../scripts/prelaunch-rules.ts';

const ALERT = "'sha256-bhHHL3z2vDgxUt0W3dWQOrprscmda2Y5pLsLg4GF+pI='"; // alert(1)
const page = (path: string, html: string) => ({ path, html });
const vercelJson = readFileSync(new URL('../vercel.json', import.meta.url), 'utf8');
const csp = cspFromVercelJson(vercelJson) ?? '';
/** The one Blob store img-src allows. A screenshot anywhere else would be blocked. */
const SCREENSHOT_ORIGIN = 'https://fnlmdoepsgemyryt.public.blob.vercel-storage.com';

describe('inline script hashes', () => {
  it('hashes inline scripts the browser runs, exactly as written', () => {
    expect(inlineScriptHashes('<script>alert(1)</script>')).toEqual([ALERT]);
    expect(inlineScriptHashes('<script type="module">alert(1)</script>')).toEqual([ALERT]);
    expect(inlineScriptHashes('<script type="text/javascript">alert(1)</script>')).toEqual([ALERT]);
  });
  it('skips external scripts, data blocks and empty scripts', () => {
    expect(
      inlineScriptHashes(
        '<script src="/a.js"></script><script type="application/ld+json">{"a":1}</script><script></script>',
      ),
    ).toEqual([]);
  });
});

describe('CSP hash rule', () => {
  const policy = `default-src 'self'; script-src 'self' ${ALERT}`;
  it('passes when every inline script is allowed', () => {
    expect(checkCspHashes([page('a.html', '<script>alert(1)</script>')], policy)).toEqual([]);
  });
  it('reports each unknown script once, with its pages', () => {
    const f = checkCspHashes([page('a.html', '<script>alert(2)</script>'), page('b.html', '<script>alert(2)</script>')], policy);
    expect(f).toHaveLength(1);
    expect(f[0].detail).toMatch(/^inline script 'sha256-[^']+' on 2 pages \(a\.html, b\.html\) is not in script-src/);
  });
  it('fails without a policy', () => {
    expect(checkCspHashes([], undefined)).toHaveLength(1);
  });
});

describe('vercel.json headers', () => {
  it('sets a CSP for every path with the required directives', () => {
    expect(cspSources(csp, 'img-src')).toEqual(["'self'", 'data:', SCREENSHOT_ORIGIN]);
    expect(cspSources(csp, 'form-action')).toEqual(["'self'", 'https://fpqyuzkrshokqxtjtffi.supabase.co']);
    expect(cspSources(csp, 'frame-ancestors')).toEqual(["'none'"]);
    expect(cspSources(csp, 'base-uri')).toEqual(["'self'"]);
    expect(cspSources(csp, 'object-src')).toEqual(["'none'"]);
    expect(cspSources(csp, 'default-src')).toEqual(["'self'"]);
  });
  it('allows scripts only from the site and by hash', () => {
    const scripts = cspSources(csp, 'script-src');
    expect(scripts[0]).toBe("'self'");
    for (const s of scripts.slice(1)) expect(s).toMatch(/^'sha256-[A-Za-z0-9+/]+=*'$/);
    expect(csp).not.toMatch(/unsafe-eval|strict-dynamic/);
    expect(scripts).not.toContain("'unsafe-inline'");
  });
  it('sets Referrer-Policy and X-Content-Type-Options', () => {
    const all = (JSON.parse(vercelJson).headers as { source: string; headers: { key: string; value: string }[] }[]).find(
      (h) => h.source === '/(.*)',
    );
    const get = (k: string) => all?.headers.find((h) => h.key === k)?.value;
    expect(get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
    expect(get('X-Content-Type-Options')).toBe('nosniff');
  });
});

describe('screenshots and img-src', () => {
  it('every https screenshot on a board is on the store img-src allows', () => {
    const dir = new URL('../src/content/scoreboard/', import.meta.url);
    const urls = readdirSync(dir)
      .filter((f) => f.endsWith('.md'))
      .flatMap((f) => [...readFileSync(new URL(f, dir), 'utf8').matchAll(/^\s*screenshot:\s*['"]?(https:\/\/[^\s'"]+)/gm)].map((m) => m[1]!));
    expect(urls.length).toBeGreaterThan(0);
    expect(urls.filter((u) => new URL(u).origin !== SCREENSHOT_ORIGIN)).toEqual([]);
  });
});
