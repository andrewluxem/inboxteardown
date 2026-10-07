// Markdown pages can't import config, so they use tokens that are filled from
// src/config/site.ts after rendering. Keeps every fact in one place.
import { SITE, mailto } from '../config/site';

const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const EMAIL_PROVIDER_PLACEHOLDER = '[EMAIL PROVIDER]';

export function fillSiteTokens(html: string): string {
  return html
    .replaceAll('{contactEmail}', `<a href="${escape(mailto())}">${escape(SITE.contactEmail)}</a>`)
    .replaceAll('{emailProvider}', escape(SITE.emailProvider ?? EMAIL_PROVIDER_PLACEHOLDER));
}
