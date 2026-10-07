export const SITE = {
  name: 'Inbox Teardown',
  url: 'https://inboxteardown.com',
  description: 'Yesterday\'s marketing email, scored on a public rubric every morning.',
  // TODO(andrew): set a real contact address before launch.
  contact: '[CONTACT EMAIL]',
  timezone: 'America/Denver',
  timezoneLabel: 'MT',
  // TODO(andrew): set the Watchlist price. Rendered as "{price}/mo".
  watchlistPrice: '[PRICE]',
  // Free pages show this many days of brand history.
  freeHistoryDays: 30,
} as const;

/** Read at build time. Unset means forms render but do not submit anywhere. */
export const SIGNUP_ENDPOINT: string | undefined =
  import.meta.env.PUBLIC_SIGNUP_ENDPOINT?.trim() || undefined;
