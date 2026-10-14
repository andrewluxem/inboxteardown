// Plain labels for the scorer's check names (email-scoreboard score_inbox.py).
// Labels for checks that can cap a score are the "Check" column of the
// methodology ceiling table, word for word; tests/checks.test.ts holds the two
// in sync. A check emitted for two dimensions gets a dimension suffix from the
// scorer (sufficient_live_text_design / _hygiene), so both spellings are here.

export const CHECK_LABELS: Record<string, string> = {
  // Technical hygiene
  primary_cta_resolves: "The main button's link is broken",
  dmarc_aligned: 'The sender fails DMARC alignment',
  html_under_clip_size: 'The HTML is over 102KB, so Gmail clips it',
  dmarc_record_present: 'The sending domain has no DMARC record',
  secondary_links_resolve: 'Other links in the email are broken',
  content_images_have_alt: 'More than half the content images lack alt text',
  sufficient_live_text: 'Fewer than 50 words of live text',
  sufficient_live_text_hygiene: 'Fewer than 50 words of live text',
  sufficient_live_text_design: 'Fewer than 50 words of live text',
  plain_text_mime_part: 'There is no plain-text version',
  // Trust
  no_deceptive_subject_prefix: 'The subject starts with a fake "RE:" or "FW:"',
  unsubscribe_link_in_body: 'No unsubscribe link in the body',
  postal_address_visible: 'No postal address',
  list_unsubscribe_one_click: 'An unsubscribe header without one-click unsubscribe',
  // Design & hierarchy
  no_horizontal_overflow: 'The email is wider than a phone screen',
  primary_cta_above_fold: 'The main button is below the first phone screen',
  single_primary_cta: 'Several buttons compete to be the main one',
  body_font_readable: 'Body text is smaller than 13px on a phone',
  // Subject & preheader
  preheader_not_template_text: 'The preheader is template text, such as "View in browser"',
  // Relevance
  no_unrendered_merge_fields: 'Unfilled merge fields, such as {{FirstName}}',
  // Copy & voice
  no_confirmed_typos: 'One confirmed typo',
  // Report only: shown on scorecards, never cap a score, not in the table.
  link_host_vs_from_domain: "Links go to domains other than the sender's",
  icon_link_missing_name: 'Icon links with no text label',
  utm_hygiene: 'Tracking parameters in links look wrong',
};

/** The plain label for a check name; unknown names show as they are. */
export function checkLabel(name: string): string {
  return CHECK_LABELS[name] ?? name;
}
