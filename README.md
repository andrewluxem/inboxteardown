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
| `npm run prelaunch` | Checks `dist/` for third-party `<script src>` (run after build; exits non-zero on failure) |
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

- [ ] Remove the fixtures (see above) and add real scoreboard data.
- [ ] Set `PUBLIC_SIGNUP_ENDPOINT` in the Vercel project env. Until then, forms show "Signups open soon".
- [ ] Flip `public/robots.txt` to allow crawling (instructions are in the file).
- [ ] Confirm the rubric dimension names in `src/config/rubric.ts` against `email-quality-rubric-client.md`.
- [ ] Set the Watchlist price (`watchlistPrice` in `src/config/site.ts`).
- [ ] Set the contact address (`contact` in `src/config/site.ts`).
- [ ] Fill in the `TODO(andrew)` placeholders in `src/content/pages/methodology.md`.
- [ ] Add a privacy policy page before collecting email addresses. It needs an Analytics section covering Vercel Web Analytics.
- [ ] Enable Web Analytics for the project in the Vercel dashboard (the script 404s until it is enabled).
- [ ] Run `npm run build && npm run prelaunch` and confirm it passes.
- [ ] When the tracker should go live, set `published: true` in `src/content/tracker/bf-2026.md`.

Find remaining placeholders with `grep -rn "TODO(andrew)" src`.
