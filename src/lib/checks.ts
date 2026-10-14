// The check names a scoreboard may carry: the neutral public names the scorer's
// export writes (CHECK_PUBLIC_NAMES in email-scoreboard scripts/export_board.py),
// shown as is next to PASS / FAIL / NOT VERIFIED. Each names what was checked,
// never a failure, so it reads right next to any result; what went wrong is in
// the check's detail and the dimension's note. tests/checks.test.ts holds the
// content to this list. DMARC is the only sender authentication checked.
export const PUBLIC_CHECK_NAMES = [
  'Main button link',
  'Other links',
  'Link domains',
  'Unsubscribe link',
  'Subject prefix',
  'DMARC alignment',
  'DMARC record',
  'Postal address',
  'One-click unsubscribe',
  'Plain-text version',
  'HTML size',
  'Image alt text',
  'Live text',
  'Live text (design)',
  'Live text (hygiene)',
  'Phone width',
  'Main button position',
  'Single main button',
  'Body text size',
  'Preheader',
  'Merge fields',
  'Typos',
  'Icon link labels',
  'Tracking parameters',
] as const;

const PUBLIC = new Set<string>(PUBLIC_CHECK_NAMES);

export function isPublicCheckName(name: string): boolean {
  return PUBLIC.has(name);
}
