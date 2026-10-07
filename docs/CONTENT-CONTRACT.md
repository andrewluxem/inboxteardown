# Content contract

This is the interface between the scoring pipeline and the site. The pipeline
writes Markdown files with YAML frontmatter into `src/content/`; the site reads
them at build time. The Zod schemas in `src/lib/schemas.ts` enforce every rule
below, so a malformed file fails `npm run build`.

## Scoreboard: `src/content/scoreboard/YYYY-MM-DD.md`

One file per day. The filename must equal `date`. A scoreboard dated Oct 7
scores the sends from Oct 6.

```yaml
---
date: 2026-10-07                    # YYYY-MM-DD, must match the filename
generated_at: 2026-10-07T13:00:00Z  # ISO 8601 timestamp; shown in MT on the home page
rubric_version: "1.0"               # quote it, or YAML reads it as a number
emails:                             # at least one
  - id: 2026-10-06-kestrel-outdoor-1   # globally unique across ALL files; a-z, 0-9, hyphens
    brand: Kestrel Outdoor
    brand_slug: kestrel-outdoor        # a-z, 0-9, hyphens; groups emails into brand pages
    industry: ecommerce                # see industries below
    kind: campaign                     # campaign | welcome | transactional
    sent_at: 2026-10-07T00:42:00Z      # ISO 8601; the brand page buckets by MT calendar date
    subject: "LAST CHANCE!!! Ends tonight"
    preheader: "View this email in your browser"   # optional, defaults to ""
    themes: [last chance, "% off", countdown]      # optional, defaults to []
    dimensions:                        # all 8 required, no extras
      subject_preheader: { score: 2, note: "...", source: judgment }
      offer_clarity:     { score: 4, note: "...", source: judgment }
      design_hierarchy:  { score: 4, note: "...", source: judgment }
      copy_voice:        { score: 4, note: "...", source: judgment }
      cta:               { score: 4, note: "...", source: judgment }
      personalization:   { score: 3, note: "...", source: judgment }
      trust:             { score: 4, note: "...", source: both }
      technical_hygiene: { score: 1, note: "...", source: check }
    checks:                            # optional, defaults to []
      - { name: "Links resolve", result: fail, detail: "1 of 9 links returns 404" }
      - { name: "Unsubscribe present", result: pass }
    screenshot: null                   # or "/shots/<file>"; put the file in public/shots/
---
```

Rules:

- `score` is an integer from 1 to 5. `note` is a non-empty string. `source` is
  `check`, `judgment`, or `both`.
- `checks[].result` is `pass` or `fail`; `detail` is optional.
- Subjects are rendered as text. Merge tags such as `{{FirstName}}` show
  literally, which is intended. Quote any subject that starts with `{`, `[`,
  `*`, `!`, or contains `: `.
- Unknown keys anywhere in an email fail the build.

### Industries

| key | label |
|---|---|
| `ecommerce` | E-commerce |
| `fashion` | Fashion |
| `food` | Food |
| `travel` | Travel |
| `home` | Home |
| `saas` | SaaS |
| `media` | Media |
| `finance` | Finance |
| `health` | Health |
| `other` | Other |

### Derived, never stored

Computed in `src/lib/scoring.ts`. Do not write these into content.

- `total`: the sum of the 8 dimension scores, 8 to 40.
- `capped`: true when `trust.score` or `technical_hygiene.score` is 1.
- `band`: `capped` if capped, otherwise `strong` (33 to 40), `solid` (24 to 32), or `weak` (under 24).
- Ranking: non-capped emails by total descending, then capped emails by total descending.

### Brand pages

Brand pages are derived by grouping every scoreboard email by `brand_slug`.
There is no brand collection. Free pages show the 30 send days ending the day
before the newest scoreboard. A brand's industry and display name come from
its most recent send.

## Teardowns: `src/content/teardowns/YYYY-MM-DD-slug.md`

The URL is `/teardown/<slug>/`: the filename with the date prefix removed.

```yaml
---
title: "30 welcome series, scored"
number: 1                     # positive integer
date: 2026-10-07
dek: "One-sentence summary."
read_minutes: 6               # positive integer
featured_email_ids:           # optional; every id must exist in a scoreboard file
  - 2026-10-05-ledgerly-1
draft: false                  # optional, default false; drafts are excluded from production builds
---
Markdown body.
```

## Tracker: `src/content/tracker/<name>.md`

The tracker page is built from this file alone. It is served at
`/tracker/<slug>/`.

```yaml
---
slug: black-friday-2026
title: "Black Friday 2026 tracker"
start: 2026-11-01
end: 2026-11-30
cohort_frozen: 2026-10-26
published: false              # false: page builds with noindex, a preview banner, and no nav or sitemap entry
cohort_size: 11
updated_at: 2026-11-20T14:00:00Z   # optional (addition): shown as "Updated ..." in the eyebrow
october_avg_score: 29.1            # optional (addition): baseline for the "avg score" stat
days:                         # each date must fall within start..end
  - { date: 2026-11-01, launched_cumulative: 2, sends: 9, sends_vs_baseline: 4 }   # sends_vs_baseline is % change: 4 = +4%
brands:
  - { brand: Kestrel Outdoor, brand_slug: kestrel-outdoor, first_mention: 2026-10-29, discount: 30, sends_since: 14, avg_score: 27.4 }
    # discount: headline % off as a number 0 to 100, or null when there is none
categories:
  - { industry: ecommerce, sends_vs_baseline: 72 }
---
```

`updated_at` and `october_avg_score` were added beyond the original spec,
because the page needs an update time and an October baseline and must be
built from this file alone. Both are optional.

## Pages: `src/content/pages/methodology.md`

Frontmatter: `title`, `description`, optional `rubric_version`, `rubric_date`.
The body is the methodology prose. Dimension names come from
`src/config/rubric.ts`, not from this file.

## Cross-file checks

These run during the build (`src/lib/content.ts`) and fail it with a message
naming the file:

- A scoreboard filename that does not match its `date`.
- An email `id` that appears in more than one file.
- A teardown that features an email id that does not exist.
