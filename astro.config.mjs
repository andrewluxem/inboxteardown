// @ts-check
import { readdirSync, readFileSync } from 'node:fs';
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { parse } from 'yaml';

/**
 * Trackers stay out of the sitemap until their content file says
 * `published: true`. Content collections are not available in config, so the
 * frontmatter is read directly.
 */
function unpublishedTrackerPaths() {
  const dir = new URL('./src/content/tracker/', import.meta.url);
  return readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => parse(readFileSync(new URL(f, dir), 'utf8').split(/^---$/m)[1] ?? ''))
    .filter((fm) => fm && fm.published !== true)
    .map((fm) => `/tracker/${fm.slug}/`);
}

const hidden = ['/signups-soon/', ...unpublishedTrackerPaths()];

export default defineConfig({
  site: 'https://inboxteardown.com',
  output: 'static',
  trailingSlash: 'always',
  integrations: [
    sitemap({
      filter: (page) => !hidden.some((path) => new URL(page).pathname === path),
    }),
  ],
});
