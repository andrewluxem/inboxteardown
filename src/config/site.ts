// Single source for site-wide facts. Pages, the footer, the privacy page,
// astro.config.mjs, robots.txt, OG images, and the prelaunch check all read
// from here. Keep it free of import.meta.env so plain Node can import it.
export const SITE = {
  name: 'Inbox Teardown',
  siteUrl: 'https://www.inboxteardown.com',
  contactEmail: 'hello@inboxteardown.com',
  // TODO(andrew): name the email provider once chosen. While null, the privacy
  // page shows the [EMAIL PROVIDER] placeholder.
  emailProvider: null as string | null,
  // Pre-launch: robots.txt disallows everything until this is true.
  allowIndexing: false,
  description: 'Yesterday\'s marketing email, scored on a public rubric every morning.',
  tagline: 'Scored competitive email intel',
  timezone: 'America/Denver',
  timezoneLabel: 'MT',
  // TODO(andrew): set the Watchlist price. Rendered as "{price}/mo".
  watchlistPrice: '[PRICE]',
  // Free pages show this many days of brand history.
  freeHistoryDays: 30,
};

export const SITE_HOST = new URL(SITE.siteUrl).host;

export function mailto(subject?: string): string {
  return `mailto:${SITE.contactEmail}${subject ? `?subject=${encodeURIComponent(subject)}` : ''}`;
}
