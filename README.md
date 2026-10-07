# Inbox Teardown

The public, free-tier site for [inboxteardown.com](https://inboxteardown.com): a daily email
scoreboard, per-email scorecards, brand pages, a weekly teardown archive, a methodology page,
and a Black Friday tracker that stays hidden until launch.

Static Astro site. No client framework. Every page reads fine with JavaScript off; JS only adds
scoreboard filtering, the "signups open soon" message, and analytics.

## Analytics and third-party scripts

Vercel Web Analytics is the only analytics. It is rendered once, in `src/layouts/Base.astro`,
and loads its script from the site's own `/_vercel/insights/` path. No other analytics or
third-party scripts are allowed. `npm run prelaunch` fails if any built page has a
`<script src>` pointing anywhere but the site itself.

## Site config

`src/config/site.ts` holds the site URL (`https://www.inboxteardown.com`), contact address,
email provider, indexing switch, and Watchlist price. `astro.config.mjs`, every page, the footer,
the privacy and methodology pages, robots.txt, OG images, and the prelaunch check read from it.
Markdown pages use `{contactEmail}` and `{emailProvider}` tokens, filled in from the config at build.

## Open Graph images

1200x630 PNGs are generated at build time by prerendered endpoints under `src/pages/og/`
(satori + resvg, no runtime functions): a default site card, the scoreboard home, one per teardown,
and one per tracker. Samples are in `docs/og-samples/`. The display face is Archivo Narrow 700,
because satori cannot read WOFF2 or apply the variable font's width axis.

## Commands

Requires Node 22+.

| Command | What it does |
|---|---|
| `npm install` | Install dependencies |
| `npm run dev` | Dev server at http://localhost:4321 (draft teardowns visible) |
| `npm run build` | Production build to `dist/` (fails on any content schema error) |
| `npm run preview` | Serve `dist/` locally |
| `npm test` | Vitest unit tests (scoring, brand aggregation, schemas) |
| `npm run check` | `astro check` type and template diagnostics |
| `npm run prelaunch` | Launch gate over `src/` and `dist/` (run after build). Reports every failure, exits 1 if any rule fails |
| `npm run screenshots` | Playwright screenshots into `docs/screenshots/` (run after build; first time: `npx playwright install chromium`) |

## Content contract (summary)

The scoring pipeline writes files; the site reads them. Full spec with examples:
[docs/CONTENT-CONTRACT.md](docs/CONTENT-CONTRACT.md).

- `src/content/scoreboard/YYYY-MM-DD.md`: one file per day, a list of scored emails with 8
  dimension scores (integers 1 to 5), notes, sources, and check results.
- `src/content/teardowns/YYYY-MM-DD-slug.md`: weekly articles. `draft: true` hides them in production.
- `src/content/tracker/bf-2026.md`: Black Friday tracker data. `published: false` keeps it hidden.
- `src/content/pages/methodology.md`: methodology prose.

Totals, caps, bands, and rankings are derived in `src/lib/scoring.ts` and never stored.
Brand pages are derived by grouping scoreboard emails by `brand_slug`.

## Adding a day of scoreboard data

1. Write `src/content/scoreboard/YYYY-MM-DD.md` where the date is the scoreboard date (sends
   from the previous day). The `date` field must match the filename.
2. Give every email a globally unique, URL-safe `id`. The convention is
   `<send date>-<brand_slug>-<n>`.
3. Run `npm run build`. A schema violation (missing dimension, score outside 1 to 5, unknown
   industry, duplicate id) fails the build and names the file and field.
4. Commit and push. The home page always shows the newest file.

## Removing the fixtures

All current content is fictional fixture data. Every fixture file starts with a
`# FIXTURE` comment. Once the pipeline writes real files:

```bash
git rm src/content/scoreboard/2026-10-0[5-7].md
git rm src/content/teardowns/2026-10-07-30-welcome-series-scored.md src/content/teardowns/2026-10-14-black-friday-early-movers.md
# Replace, don't delete, the tracker: the build expects src/content/tracker/ to hold the BF file.
```

The build needs at least one scoreboard file. Remove the fixtures in the same commit that adds
the first real scoreboard. The screenshots in `docs/screenshots/` show fixture data; regenerate them
with `npm run screenshots` once real data exists.

`tests/fixtures/malformed-scoreboard.md` is a test fixture, not site content. Keep it.

## Pre-launch checklist

`npm run build && npm run prelaunch` is the checklist. It must pass before launch. It fails on:

- any third-party `<script src>` (only the site itself and Vercel's `/_vercel/insights/` path are allowed)
- any `TODO(andrew)` in `src/`
- bracketed placeholders such as `[PRICE]` or `[EMAIL PROVIDER]` in built pages
- any fixture brand name in `src/content/` (remove the fixtures, see above)
- `/privacy/` missing from the build
- `PUBLIC_SIGNUP_ENDPOINT` unset at build time (set it in the Vercel project env)
- robots.txt blocking everything (set `allowIndexing: true` in `src/config/site.ts`)
- an indexable page without an `og:image`, or one pointing at a file that isn't built
- a footer missing the contact address

Not covered by the check:

- [ ] Enable Web Analytics for the project in the Vercel dashboard (the script 404s until it is enabled).
- [ ] When the tracker should go live, set `published: true` in `src/content/tracker/bf-2026.md`.

Find remaining placeholders with `grep -rn "TODO(andrew)" src`.
