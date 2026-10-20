import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { brandRedirectsSchema } from '../src/lib/schemas';

const map = JSON.parse(readFileSync(join(import.meta.dirname, '../src/data/brand-redirects.json'), 'utf8'));
const issues = (v: unknown) => (brandRedirectsSchema.safeParse(v).error?.issues ?? []).map((i) => `${i.path.join('.')}: ${i.message}`);
const withRedirects = (redirects: unknown[], extra: Record<string, unknown> = {}) => ({ ...map, ...extra, redirects });

describe('src/data/brand-redirects.json', () => {
  it('matches the schema', () => {
    expect(issues(map)).toEqual([]);
  });
});

describe('brandRedirectsSchema rejects', () => {
  const email = { source: '/email/2026-10-13-a-b-1/', destination: '/email/2026-10-13-a-1/', permanent: true };
  const brand = { source: '/brand/a-b/', destination: '/brand/a/', permanent: true };
  const counts = { email_pages: 1, brand_pages: 1 };

  it('accepts a minimal valid map', () => {
    expect(issues(withRedirects([email, brand], counts))).toEqual([]);
  });
  it('a path without a trailing slash', () => {
    expect(issues(withRedirects([{ ...email, source: '/email/2026-10-13-a-b-1' }, brand], counts))).toHaveLength(1);
  });
  it('a path outside /email/ and /brand/', () => {
    expect(issues(withRedirects([email, { ...brand, destination: '/tracker/a/' }], counts))).not.toEqual([]);
  });
  it('a temporary redirect', () => {
    expect(issues(withRedirects([{ ...email, permanent: false }, brand], counts))).toHaveLength(1);
  });
  it('an unknown key', () => {
    expect(issues(withRedirects([{ ...email, status: 301 }, brand], counts))).toHaveLength(1);
  });
  it('a duplicate source', () => {
    expect(issues(withRedirects([email, email, brand], { ...counts, email_pages: 2 }))).toEqual([
      'redirects.1.source: Duplicate source /email/2026-10-13-a-b-1/',
    ]);
  });
  it('a chain', () => {
    const next = { source: '/brand/a/', destination: '/brand/c/', permanent: true };
    expect(issues(withRedirects([email, brand, next], { ...counts, brand_pages: 2 }))).toEqual([
      'redirects.1.destination: /brand/a/ is itself a redirect source (a chain)',
    ]);
  });
  it('an email page redirected to a brand page', () => {
    expect(issues(withRedirects([{ ...email, destination: '/brand/a/' }, brand], counts))).toHaveLength(1);
  });
  it('counts that disagree with the list', () => {
    expect(issues(withRedirects([email, brand], { email_pages: 2, brand_pages: 0 }))).toHaveLength(2);
  });
});
