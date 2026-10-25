import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createHandler, siteForOrigin } from '../supabase/functions/inboxteardown-signup/handler.ts';

const SUPABASE_URL = 'https://project.supabase.co';
const KEY = 'service-role-key';
const INBOX = 'https://www.inboxteardown.com';
const PAGE = 'https://www.pageteardown.com';
const INBOX_PREVIEW = 'https://inboxteardown-8hpipalfe-andrewluxemcrm-projects.vercel.app';
const PAGE_PREVIEW = 'https://pageteardown-git-feat-watchlist-waitlist-andrewluxemcrm-projects.vercel.app';

type Row = Record<string, unknown>;

/**
 * A fake PostgREST insert: honors ?on_conflict= with
 * Prefer: resolution=ignore-duplicates the way the real one does, by
 * skipping a row whose on_conflict columns match a stored row.
 */
function fakeDb() {
  const rows: Row[] = [];
  const calls: { url: URL; headers: Headers }[] = [];
  const fetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input));
    const headers = new Headers(init?.headers);
    calls.push({ url, headers });
    const row = JSON.parse(String(init?.body)) as Row;
    const keys = (url.searchParams.get('on_conflict') ?? '').split(',');
    const dupe = rows.some((r) => keys.every((k) => r[k] === row[k]));
    if (!dupe) rows.push(row);
    else if (!headers.get('prefer')?.includes('resolution=ignore-duplicates')) return new Response('duplicate', { status: 409 });
    return new Response(null, { status: 201 });
  });
  return { rows, calls, fetch, handler: createHandler({ supabaseUrl: SUPABASE_URL, serviceRoleKey: KEY, fetch }) };
}

function post(origin: string | null, fields: Record<string, string>, headers: Record<string, string> = {}): Request {
  return new Request(`${SUPABASE_URL}/functions/v1/inboxteardown-signup`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', ...(origin ? { origin } : {}), ...headers },
    body: new URLSearchParams(fields).toString(),
  });
}

const watchlist = (email = 'Someone@Example.com', extra: Record<string, string> = {}) => ({
  list: 'watchlist',
  source: '/watchlist/',
  website: '',
  email,
  ...extra,
});

afterEach(() => vi.restoreAllMocks());

describe('production origins', () => {
  it.each([
    ['https://inboxteardown.com', 'inbox'],
    ['https://www.inboxteardown.com', 'inbox'],
    ['https://pageteardown.com', 'page'],
    ['https://www.pageteardown.com', 'page'],
  ])('%s signs up as site=%s and redirects back to itself', async (origin, site) => {
    const db = fakeDb();
    const res = await db.handler(post(origin, watchlist()));
    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toBe(`${origin}/signed-up/?list=watchlist`);
    expect(res.headers.get('access-control-allow-origin')).toBe(origin);
    expect(db.rows).toHaveLength(1);
    expect(db.rows[0]).toMatchObject({ email: 'someone@example.com', list: 'watchlist', site, is_preview: false, source_page: '/watchlist/' });
  });

  it('sends the service role key and upserts on the table', async () => {
    const db = fakeDb();
    await db.handler(post(PAGE, watchlist()));
    const { url, headers } = db.calls[0]!;
    expect(url.origin + url.pathname).toBe(`${SUPABASE_URL}/rest/v1/inboxteardown_signups`);
    expect(headers.get('apikey')).toBe(KEY);
    expect(headers.get('authorization')).toBe(`Bearer ${KEY}`);
  });

  it('ignores a site value sent in the form', async () => {
    const db = fakeDb();
    await db.handler(post(INBOX, watchlist('a@b.co', { site: 'page', is_preview: 'true' })));
    expect(db.rows[0]).toMatchObject({ site: 'inbox', is_preview: false });
  });
});

describe('preview origins', () => {
  it.each([
    [INBOX_PREVIEW, 'inbox'],
    ['https://inboxteardown-git-main-andrewluxemcrm-projects.vercel.app', 'inbox'],
    ['https://pageteardown-a1b2c3d4e-andrewluxemcrm-projects.vercel.app', 'page'],
    [PAGE_PREVIEW, 'page'],
  ])('%s signs up as site=%s with is_preview and redirects back to the preview', async (origin, site) => {
    const db = fakeDb();
    const res = await db.handler(post(origin, watchlist()));
    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toBe(`${origin}/signed-up/?list=watchlist`);
    expect(db.rows[0]).toMatchObject({ site, is_preview: true });
  });

  it('keeps a preview test and a real signup with the same address as two rows', async () => {
    const db = fakeDb();
    await db.handler(post(PAGE_PREVIEW, watchlist('me@x.com')));
    await db.handler(post(PAGE, watchlist('me@x.com')));
    expect(db.rows.map((r) => r.is_preview)).toEqual([true, false]);
  });
});

describe('unknown origins', () => {
  it.each([
    'https://evil.example',
    'http://www.pageteardown.com',
    'https://www.pageteardown.com.evil.example',
    'https://www.socialteardown.com',
    'https://socialteardown-1kpp35d9k-andrewluxemcrm-projects.vercel.app',
    'https://scrollabouts-1kpp35d9k-andrewluxemcrm-projects.vercel.app',
    'https://pageteardown-1kpp35d9k-someone-elses-team.vercel.app',
    'https://pageteardown.vercel.app',
    'null',
    'constructor',
  ])('%s gets a bare 403 and nothing is stored', async (origin) => {
    const db = fakeDb();
    const res = await db.handler(post(origin, watchlist()));
    expect(res.status).toBe(403);
    expect(res.headers.get('location')).toBeNull();
    expect(db.fetch).not.toHaveBeenCalled();
  });

  it('rejects a request with no Origin or Referer', async () => {
    const db = fakeDb();
    expect((await db.handler(post(null, watchlist()))).status).toBe(403);
    expect(db.fetch).not.toHaveBeenCalled();
  });

  it('maps origins to sites only through the explicit lists', () => {
    expect(siteForOrigin(PAGE)).toEqual({ site: 'page', isPreview: false });
    expect(siteForOrigin(INBOX_PREVIEW)).toEqual({ site: 'inbox', isPreview: true });
    expect(siteForOrigin('https://socialteardown.com')).toBeNull();
    expect(siteForOrigin('__proto__')).toBeNull();
  });
});

describe('form handling', () => {
  it('treats a filled honeypot as success and stores nothing', async () => {
    const db = fakeDb();
    const res = await db.handler(post(PAGE, watchlist('bot@spam.com', { website: 'https://spam.example' })));
    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toBe(`${PAGE}/signed-up/?list=watchlist`);
    expect(db.fetch).not.toHaveBeenCalled();
  });

  it('sends an invalid address back to the form page on its own site', async () => {
    const db = fakeDb();
    const res = await db.handler(post(PAGE, watchlist('not-an-email')));
    expect(res.headers.get('location')).toBe(`${PAGE}/watchlist/?signup=invalid#signup-watchlist-email`);
    expect(db.fetch).not.toHaveBeenCalled();
  });

  it('sends an insert failure to the error page on its own site', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const fetch = vi.fn(async () => new Response('boom', { status: 500 }));
    const handler = createHandler({ supabaseUrl: SUPABASE_URL, serviceRoleKey: KEY, fetch });
    const res = await handler(post(PAGE, watchlist()));
    expect(res.headers.get('location')).toBe(`${PAGE}/signed-up/?signup=error`);
  });

  it('rejects an unknown list', async () => {
    const db = fakeDb();
    const res = await db.handler(post(PAGE, watchlist('a@b.co', { list: 'everything' })));
    expect(res.headers.get('location')).toBe(`${PAGE}/signed-up/?signup=error`);
    expect(db.fetch).not.toHaveBeenCalled();
  });
});

describe('duplicates', () => {
  it('stores one row when the same address joins the same list twice on one site', async () => {
    const db = fakeDb();
    const first = await db.handler(post(PAGE, watchlist('Dup@X.com')));
    const second = await db.handler(post(PAGE, watchlist('dup@x.com')));
    expect(first.headers.get('location')).toBe(second.headers.get('location'));
    expect(second.headers.get('location')).toBe(`${PAGE}/signed-up/?list=watchlist`);
    expect(db.rows).toHaveLength(1);
  });

  it('stores two rows when the same address joins the same list on two sites', async () => {
    const db = fakeDb();
    await db.handler(post(INBOX, watchlist('both@x.com')));
    await db.handler(post(PAGE, watchlist('both@x.com')));
    expect(db.rows.map((r) => r.site)).toEqual(['inbox', 'page']);
  });

  it("upserts on the migration's unique key", async () => {
    const db = fakeDb();
    await db.handler(post(PAGE, watchlist()));
    const migration = readFileSync(new URL('../supabase/migrations/20261025225000_inboxteardown_signups_site.sql', import.meta.url), 'utf8');
    const key = /unique \(([^)]+)\)/.exec(migration)?.[1]?.replace(/\s/g, '');
    expect(db.calls[0]!.url.searchParams.get('on_conflict')).toBe(key);
  });
});
