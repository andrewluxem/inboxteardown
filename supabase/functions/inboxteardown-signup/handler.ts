// Receives the signup forms of the Teardown sites (each site's
// src/components/SignupForm.astro): a native urlencoded POST with `email`,
// `list`, `source` (the form's page path, set at build time) and the
// `website` honeypot. Which site a signup belongs to is never read from the
// form: it comes from the request's Origin (SITE_ORIGINS, PREVIEW_ORIGIN).
// The browser navigates here, so every outcome is a 303 back to the origin
// the request came from: an invalid email goes back to the form's page with
// ?signup=invalid, and every other failure goes to /signed-up/?signup=error.
// Only a disallowed origin gets a bare 403, since there is no trusted site to
// send it to.
//
// No Deno globals here, so the tests can run it under Node; index.ts hands it
// to Deno.serve with the function's env.

export type Site = 'inbox' | 'page';

// Production origins, bare and www. Social Teardown is not served here yet:
// its signups go to its own socialteardown_signups table. The table's site
// check already allows 'social' for when it moves over.
const SITE_ORIGINS = new Map<string, Site>([
  ['https://inboxteardown.com', 'inbox'],
  ['https://www.inboxteardown.com', 'inbox'],
  ['https://pageteardown.com', 'page'],
  ['https://www.pageteardown.com', 'page'],
]);

// Vercel preview deployments of these sites' projects only: deployment URLs
// (<project>-<9-character id>-<team>.vercel.app) and branch URLs
// (<project>-git-<branch>-<team>.vercel.app). Their signups are stored with
// is_preview = true, so preview tests never mix with real signups.
const PREVIEW_PROJECTS = new Map<string, Site>([
  ['inboxteardown', 'inbox'],
  ['pageteardown', 'page'],
]);
const PREVIEW_ORIGIN = /^https:\/\/([a-z]+)-(?:[a-z0-9]{9}|git-[a-z0-9-]+)-andrewluxemcrm-projects\.vercel\.app$/;

// bfcm: the Black Friday tracker's "email me the day the first brand starts".
const LISTS = new Set(['newsletter', 'watchlist', 'bfcm']);
const MAX_BODY_BYTES = 4096;
// Deliberately loose: one @, no spaces, a dot in the domain. Typos beyond that
// are the visitor's to fix; the browser's type=email check runs first anyway.
const EMAIL = /^[^\s@]{1,64}@[^\s@.]+(\.[^\s@.]+)+$/;
// Must match the table's unique key (migration 20261025225000), or PostgREST
// rejects the insert.
const ON_CONFLICT = 'email,site,list,is_preview';

export interface Config {
  supabaseUrl: string;
  serviceRoleKey: string;
  /** Defaults to the global fetch; tests pass a fake PostgREST. */
  fetch?: typeof fetch;
}

/** The site an Origin belongs to, or null when it is not allowed. */
export function siteForOrigin(origin: string | null): { site: Site; isPreview: boolean } | null {
  if (!origin) return null;
  const site = SITE_ORIGINS.get(origin);
  if (site) return { site, isPreview: false };
  const project = PREVIEW_ORIGIN.exec(origin)?.[1];
  const preview = project ? PREVIEW_PROJECTS.get(project) : undefined;
  return preview ? { site: preview, isPreview: true } : null;
}

/** A same-site path such as /tracker/black-friday-2026/, or null. No //host, no query. */
function sitePath(v: string | null): string | null {
  if (!v || v.length > 512 || !/^\/(?!\/)[A-Za-z0-9\-._~\/]*$/.test(v)) return null;
  return v;
}

function originOf(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

function corsHeaders(origin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  };
}

function text(status: number, body: string, headers: Record<string, string> = {}): Response {
  return new Response(body, { status, headers: { ...headers, 'Content-Type': 'text/plain; charset=utf-8', Vary: 'Origin' } });
}

function redirect(location: string, origin: string): Response {
  return new Response(null, { status: 303, headers: { ...corsHeaders(origin), Location: location } });
}

/** Reads at most `limit` bytes; null if the body is larger. */
async function readCapped(req: Request, limit: number): Promise<string | null> {
  const declared = Number(req.headers.get('content-length') ?? '0');
  if (declared > limit) return null;
  if (!req.body) return '';
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const all = new Uint8Array(size);
  let at = 0;
  for (const c of chunks) {
    all.set(c, at);
    at += c.byteLength;
  }
  return new TextDecoder().decode(all);
}

export function createHandler(config: Config): (req: Request) => Promise<Response> {
  const send = config.fetch ?? fetch;

  return async (req) => {
    const referer = req.headers.get('referer');
    const origin = req.headers.get('origin') ?? originOf(referer);
    const from = siteForOrigin(origin);
    if (!origin || !from) return text(403, 'Forbidden');

    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(origin) });

    // Anything that is not a duplicate or an invalid email lands here.
    const failed = () => redirect(`${origin}/signed-up/?signup=error`, origin);

    if (req.method !== 'POST') return failed();

    const type = (req.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
    if (type !== 'application/x-www-form-urlencoded') return failed();

    const raw = await readCapped(req, MAX_BODY_BYTES);
    if (raw === null) return failed();
    const form = new URLSearchParams(raw);

    const list = form.get('list') ?? '';
    if (!LISTS.has(list)) return failed();
    const signedUp = `${origin}/signed-up/?list=${list}`;

    // Bots fill every field; people never see this one. Same answer as success.
    if ((form.get('website') ?? '') !== '') return redirect(signedUp, origin);

    // The form's own `source` field first. The sites' Referrer-Policy sends
    // only the origin cross-site, so a Referer path is a fallback for older
    // forms, trusted only from the same allowed origin.
    let sourcePage = sitePath(form.get('source'));
    if (!sourcePage && referer && originOf(referer) === origin) sourcePage = sitePath(new URL(referer).pathname);

    // Back to the form's page; the form shows a message for ?signup=invalid.
    const email = (form.get('email') ?? '').trim().toLowerCase();
    if (email.length > 254 || !EMAIL.test(email)) {
      return redirect(`${origin}${sourcePage ?? '/'}?signup=invalid#signup-${list}-email`, origin);
    }

    // A duplicate (email, site, list, is_preview) is ignored, so new and
    // repeat signups look the same.
    try {
      const res = await send(`${config.supabaseUrl}/rest/v1/inboxteardown_signups?on_conflict=${ON_CONFLICT}`, {
        method: 'POST',
        headers: {
          apikey: config.serviceRoleKey,
          Authorization: `Bearer ${config.serviceRoleKey}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=ignore-duplicates,return=minimal',
        },
        body: JSON.stringify({
          email,
          list,
          site: from.site,
          is_preview: from.isPreview,
          source_page: sourcePage,
          consent_at: new Date().toISOString(),
        }),
      });
      if (!res.ok) {
        console.error('insert failed', res.status, await res.text());
        return failed();
      }
    } catch (err) {
      console.error('insert failed', err);
      return failed();
    }
    return redirect(signedUp, origin);
  };
}
