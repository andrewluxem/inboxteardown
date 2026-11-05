// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';
import { SITE } from './src/config/site.ts';
import { brandRedirects } from './src/integrations/brand-redirects.ts';

// Tracker pages are always in the sitemap: published: false only keeps their
// data off the page (it renders the pre-start state), never the page itself.
const hidden = ['/signups-soon/', '/signed-up/'];
const isHidden = (/** @type {string} */ path) => hidden.includes(path);

export default defineConfig({
  site: SITE.siteUrl,
  output: 'static',
  // The adapter only turns Astro redirects into real 308s on Vercel; every
  // page is still prerendered and vercel.json still sets the headers.
  adapter: vercel(),
  trailingSlash: 'always',
  vite: {
    // OG image tooling runs only at build time; let Node load it as-is
    // (resvg ships a native addon and satori relies on CommonJS globals).
    ssr: { external: ['satori', '@resvg/resvg-js'] },
  },
  integrations: [
    // Old brand and email URLs: see src/lib/redirects.ts.
    brandRedirects(),
    sitemap({
      filter: (page) => !isHidden(new URL(page).pathname),
    }),
  ],
});
