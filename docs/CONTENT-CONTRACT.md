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
    screenshot: null                   # or an https:// Blob URL (or "/shots/<file>" for fixtures)
    correction:                        # optional; set when a published score changes
      date: 2026-10-08
      note: "Technical hygiene raised from 1 to 3: the CTA link was fixed before most opens." 
---
```

Rules:

- `score` is an integer from 1 to 5. `note` is a non-empty string. `source` is
  `check`, `judgment`, or `both`.
- `checks[].result` is `pass`, `fail`, or `unverified`; `detail` is optional.
  Use `unverified` when a check could not reach a verdict (HTTP 403 or 429, a
  timeout, a redirect with no Location header, an image-only footer). Rubric
  v1 never lowers a score for it.
- `screenshot` is `null`, a path under `/shots/`, or an `https://` URL. Real
  screenshots live in the public Blob store and are referenced by URL, never
  committed.
- Subjects are rendered as text. Merge tags such as `{{FirstName}}` show
  literally, which is intended. Quote any subject that starts with `{`, `[`,
  `*`, `!`, or contains `: `.
- `correction` is optional. When present, the scorecard shows "Corrected {date}: {note}" in the
  verdict block. Update the dimension scores themselves to the corrected values.
- Unknown keys anywhere in an email fail the build.

### Hard-fail evidence gate (standing rule)

A score of 1 on `trust` or `technical_hygiene` caps the email publicly. The
build rejects any such score unless the email has at least one check with
`result: fail` and a non-empty `detail`.

The schema can only confirm that evidence is present, not that it is correct.
So there is a process rule too: any pipeline change that adds or alters a
hard-fail path (a check that can force a 1) must have its output reviewed
against raw evidence (status codes, headers, HTML) before that output goes
into a PR. Oct 7 is the precedent: 17 of 19 sends hard-failed on checks that
the evidence pull did not confirm.

### Rubric v1 key mapping

The content keys predate Rubric v1 and stay fixed. The pipeline's v1 slugs map
onto them, and only the display names in `src/config/rubric.ts` changed.

| Rubric v1 slug | Content key | Display name |
|---|---|---|
| `subject` | `subject_preheader` | Subject & preheader |
| `clarity` | `offer_clarity` | Clarity |
| `design` | `design_hierarchy` | Design & hierarchy |
| `copy` | `copy_voice` | Copy & voice |
| `cta` | `cta` | Call to action |
| `relevance` | `personalization` | Relevance |
| `trust` | `trust` | Trust |
| `hygiene` | `technical_hygiene` | Technical hygiene |

Each dimension `note` is the one line of evidence the rubric requires: a quote
from the email or the deciding check's output. `source` is `check` when a
check ceiling set the score, `judgment` when Jev did, `both` when Jev scored
at a ceiling a check set.

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

## Pages: `src/content/pages/*.md`

`methodology.md` and `privacy.md`. Frontmatter: `title`, `description`,
optional `rubric_version`, `rubric_date`. Dimension names come from
`src/config/rubric.ts`, not from these files. The bodies may use
`{contactEmail}` (rendered as a mailto link) and `{emailProvider}` (the
provider name, or `[EMAIL PROVIDER]` while unset); both are filled from
`src/config/site.ts` at build.

## Cross-file checks

These run during the build (`src/lib/content.ts`) and fail it with a message
naming the file:

- A scoreboard filename that does not match its `date`.
- An email `id` that appears in more than one file.
- A teardown that features an email id that does not exist.
