// Prelaunch rules. Pure functions over file contents so each can be unit
// tested; scripts/prelaunch-check.ts gathers the inputs and reports.

export interface Failure {
  detail: string;
}
export interface TextFile {
  /** Repo-relative path, e.g. "src/config/site.ts". */
  path: string;
  text: string;
}
export interface Page {
  /** dist-relative path, e.g. "privacy/index.html". */
  path: string;
  html: string;
}

/** Vercel Web Analytics loads its script from this same-site path. */
export const VERCEL_INSIGHTS_PATH = '/_vercel/insights/';

/** The fictional fixture brands. Real brands only ever arrive via the pipeline. */
export const FIXTURE_BRANDS = [
  'Fernhill Goods',
  'Ostra Coffee Co.',
  'Marlow & Pike',
  'The Morning Ledger',
  'Ledgerly',
  'Pulsewear',
  'Brightside Pet',
  'Tidewater Travel',
  'Northgate Bank',
  'Kestrel Outdoor',
  'Cinder Kitchen',
] as const;

export const PLACEHOLDER = /\[[A-Z][A-Za-z ]{2,60}\]/g;

const list = (items: string[], max = 4) =>
  items.length <= max ? items.join(', ') : `${items.slice(0, max).join(', ')}, and ${items.length - max} more`;

/** Visible markup only: drops scripts, styles, and comments. */
function visible(html: string): string {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');
}

function metaContent(html: string, key: string): string | undefined {
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const name = tag.match(/\b(?:name|property)\s*=\s*"([^"]*)"/i)?.[1];
    if (name === key) return tag.match(/\bcontent\s*=\s*"([^"]*)"/i)?.[1];
  }
  return undefined;
}

export function isIndexable(html: string): boolean {
  return !/noindex/i.test(metaContent(html, 'robots') ?? '');
}

// ---------- Script hosts ----------

const SCRIPT_SRC = /<script\b[^>]*?\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;

/** Every `src` value on a `<script>` tag in the document. */
export function scriptSrcs(html: string): string[] {
  return [...html.matchAll(SCRIPT_SRC)].map((m) => m[1] ?? m[2] ?? m[3] ?? '');
}

/**
 * A script may load only from the site itself (relative URLs or the site's
 * own host), which includes Vercel's same-site insights path. Any other host,
 * protocol-relative URL, or data:/blob: source is a violation.
 */
export function isAllowedScriptSrc(src: string, siteHost: string): boolean {
  let url: URL;
  try {
    url = new URL(src, `https://${siteHost}/`);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return false;
  // VERCEL_INSIGHTS_PATH is served from the site's own host, so this covers it.
  return url.host === siteHost;
}

/** Third-party `<script src>` values in a document. Empty means it passes. */
export function thirdPartyScripts(html: string, siteHost: string): string[] {
  return scriptSrcs(html).filter((src) => !isAllowedScriptSrc(src, siteHost));
}

export function checkScriptHosts(pages: Page[], siteHost: string): Failure[] {
  return pages.flatMap((p) =>
    thirdPartyScripts(p.html, siteHost).map((src) => ({ detail: `${p.path}: <script src="${src}"> loads from outside ${siteHost}` })),
  );
}

// ---------- Source and content ----------

export function checkTodos(files: TextFile[]): Failure[] {
  return files.flatMap((f) =>
    f.text.split('\n').flatMap((line, i) =>
      line.includes('TODO(andrew)') ? [{ detail: `${f.path}:${i + 1}  ${line.trim().replace(/^(\/\/|#|<!--|\{\/\*)\s*/, '').replace(/\s*(-->|\*\/\})$/, '').slice(0, 140)}` }] : [],
    ),
  );
}

export function checkFixtureBrands(files: TextFile[]): Failure[] {
  return files.flatMap((f) => {
    const found = FIXTURE_BRANDS.filter((b) => f.text.includes(b));
    return found.length ? [{ detail: `${f.path}: ${list([...found], 11)}` }] : [];
  });
}

// ---------- Built HTML ----------

export function checkPlaceholders(pages: Page[]): Failure[] {
  const where = new Map<string, string[]>();
  for (const p of pages) {
    for (const m of new Set(visible(p.html).match(PLACEHOLDER) ?? [])) where.set(m, [...(where.get(m) ?? []), p.path]);
  }
  return [...where.entries()].sort().map(([ph, paths]) => ({ detail: `${ph} on ${list(paths)}` }));
}

export function checkPrivacyPage(pages: Page[]): Failure[] {
  return pages.some((p) => p.path === 'privacy/index.html') ? [] : [{ detail: '/privacy/ is not in the build' }];
}

/** Signup forms carry data-live="false" when PUBLIC_SIGNUP_ENDPOINT was unset at build time. */
export function checkSignupEndpoint(pages: Page[]): Failure[] {
  const dead = pages.filter((p) =>
    (p.html.match(/<form\b[^>]*\bdata-signup\b[^>]*>/gi) ?? []).some((tag) => /\bdata-live\s*=\s*"false"/i.test(tag)),
  );
  return dead.length
    ? [{ detail: `PUBLIC_SIGNUP_ENDPOINT was unset at build time; signup forms on ${dead.length} pages cannot submit (${list(dead.map((p) => p.path))})` }]
    : [];
}

export function checkRobots(robots: string | undefined): Failure[] {
  if (robots === undefined) return [{ detail: 'robots.txt is missing from the build' }];
  let wildcard = false;
  for (const raw of robots.split('\n')) {
    const line = raw.replace(/#.*/, '').trim();
    const [key, ...rest] = line.split(':');
    const value = rest.join(':').trim();
    if (!key) continue;
    if (/^user-agent$/i.test(key.trim())) wildcard = value === '*';
    else if (wildcard && /^disallow$/i.test(key.trim()) && value === '/') {
      return [{ detail: 'robots.txt disallows everything for User-agent: * (set allowIndexing: true in src/config/site.ts)' }];
    }
  }
  return [];
}

export function checkOgImages(pages: Page[], distFiles: Set<string>, siteUrl: string): Failure[] {
  const site = new URL(siteUrl);
  return pages.filter((p) => isIndexable(p.html)).flatMap((p) => {
    const content = metaContent(p.html, 'og:image');
    if (!content) return [{ detail: `${p.path}: no og:image` }];
    let url: URL;
    try {
      url = new URL(content);
    } catch {
      return [{ detail: `${p.path}: og:image "${content}" is not an absolute URL` }];
    }
    if (url.host !== site.host) return [{ detail: `${p.path}: og:image points off-site (${url.host})` }];
    const file = decodeURIComponent(url.pathname).replace(/^\//, '');
    return distFiles.has(file) ? [] : [{ detail: `${p.path}: og:image ${url.pathname} is not in dist/` }];
  });
}

export function checkFooterContact(pages: Page[], contactEmail: string): Failure[] {
  return pages.flatMap((p) => {
    const footer = p.html.match(/<footer\b[\s\S]*?<\/footer>/i)?.[0];
    if (!footer) return [{ detail: `${p.path}: no <footer>` }];
    return footer.includes(`mailto:${contactEmail}`) ? [] : [{ detail: `${p.path}: footer lacks ${contactEmail}` }];
  });
}
