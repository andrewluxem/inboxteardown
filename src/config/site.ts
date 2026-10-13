// Single source for site-wide facts. Pages, the footer, the privacy page,
// astro.config.mjs, robots.txt, OG images, and the prelaunch check all read
// from here. Keep it free of import.meta.env so plain Node can import it.
export const SITE = {
  name: 'Inbox Teardown',
  siteUrl: 'https://www.inboxteardown.com',
  contactEmail: 'support@inboxteardown.com',
  // Where signups are stored: the provider's display name as a plain string
  // (no link; the privacy page links to its policy separately).
  // The privacy page's "Signups are stored by {emailProvider}" renders it
  // (src/lib/site-tokens.ts). Null renders [EMAIL PROVIDER], which fails
  // prelaunch's placeholder rule.
  // Not related: signup forms post to PUBLIC_SIGNUP_ENDPOINT (Vercel env),
  // which must be set separately.
  emailProvider: 'Supabase' as string | null,
  // Must be: true at launch, and only then.
  // When true: /robots.txt becomes "User-agent: * / Allow: /" plus the
  // sitemap URL (src/pages/robots.txt.ts), and prelaunch's robots rule
  // passes. While false, robots.txt disallows everything for every crawler.
  // It changes nothing else: per-page noindex (drafts, unpublished
  // trackers, signups-soon, signed-up) and the sitemap filter work either way.
  allowIndexing: false,
  description: 'Yesterday\'s marketing email, scored on a public rubric every morning.',
  tagline: 'Scored competitive email intel',
  timezone: 'America/Denver',
  timezoneLabel: 'MT',
  // TODO(andrew): set the Watchlist price.
  // Must be: the monthly price as display text with its currency sign and
  // without "/mo", e.g. '$29'. The page appends "/mo" itself.
  // When set: /watchlist/ shows "{price}/mo" (src/pages/watchlist.astro);
  // nothing else reads it. While '[PRICE]', prelaunch's placeholder rule
  // fails on watchlist/index.html.
  watchlistPrice: '[PRICE]',
  // Free pages show this many days of brand history.
  freeHistoryDays: 30,
};

export const SITE_HOST = new URL(SITE.siteUrl).host;

export function mailto(subject?: string): string {
  return `mailto:${SITE.contactEmail}${subject ? `?subject=${encodeURIComponent(subject)}` : ''}`;
}
