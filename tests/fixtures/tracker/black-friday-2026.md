---
# TEST FIXTURE, not real data. tests/tracker-fixture.test.ts copies this to
# src/content/tracker/black-friday-2026.md in a throwaway copy of the repo and
# builds it, to prove an unpublished tracker builds as a noindex preview.
# Brand slugs are real (the build requires them to exist in board data); every
# number is made up. Never copy it into src/content/.
slug: black-friday-2026
title: "Black Friday 2026 tracker"
start: 2026-11-02
end: 2026-11-30
cohort_frozen: 2026-10-26
published: false
cohort_size: 4
updated_at: 2026-11-04T14:00:00Z
october_avg_score: 28.0
days:
  - { date: 2026-11-02, launched_cumulative: 1, sends: 6, sends_vs_baseline: 5 }
  - { date: 2026-11-03, launched_cumulative: 1, sends: 7, sends_vs_baseline: 8 }
  - { date: 2026-11-04, launched_cumulative: 3, sends: 9, sends_vs_baseline: 20 }
brands:
  - { brand: Everlane, brand_slug: everlane, first_mention: 2026-11-02, discount: 25, sends_since: 3, avg_score: 27.0 }
  - { brand: Rothy's, brand_slug: rothys, first_mention: 2026-11-04, discount: null, sends_since: 1, avg_score: 30.0 }
  - { brand: Williams Sonoma, brand_slug: williams-sonoma, first_mention: 2026-11-04, discount: 20, sends_since: 1, avg_score: 29.0 }
categories:
  - { industry: fashion, sends_vs_baseline: 15 }
  - { industry: home, sends_vs_baseline: 25 }
---
