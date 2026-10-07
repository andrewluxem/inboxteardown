// Rules for the prelaunch check. Pure functions over built HTML so they can be
// unit tested; scripts/prelaunch-check.mjs applies them to dist/.

/** Vercel Web Analytics loads its script from this same-site path. */
export const VERCEL_INSIGHTS_PATH = '/_vercel/insights/';

const SCRIPT_SRC = /<script\b[^>]*?\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;

/** Every `src` value on a `<script>` tag in the document. */
export function scriptSrcs(html) {
  return [...html.matchAll(SCRIPT_SRC)].map((m) => m[1] ?? m[2] ?? m[3] ?? '');
}

/**
 * A script may load only from the site itself (relative URLs or the site's
 * own host), which includes Vercel's same-site insights path. Any other host,
 * protocol-relative URL, or data:/blob: source is a violation.
 */
export function isAllowedScriptSrc(src, siteHost) {
  let url;
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
export function thirdPartyScripts(html, siteHost) {
  return scriptSrcs(html).filter((src) => !isAllowedScriptSrc(src, siteHost));
}
