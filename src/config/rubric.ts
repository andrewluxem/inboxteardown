// Display names follow Inbox Teardown Rubric v1. The keys are part of the
// content contract and must not change; only the display names may.
// offer_clarity displays as "Clarity" and personalization as "Relevance" so
// every dimension applies to every send (welcome and transactional included).
export const DIMENSIONS = {
  subject_preheader: 'Subject & preheader',
  offer_clarity: 'Clarity',
  design_hierarchy: 'Design & hierarchy',
  copy_voice: 'Copy & voice',
  cta: 'Call to action',
  personalization: 'Relevance',
  trust: 'Trust',
  technical_hygiene: 'Technical hygiene',
} as const;

export type DimensionKey = keyof typeof DIMENSIONS;

export const DIMENSION_KEYS = Object.keys(DIMENSIONS) as DimensionKey[];

/** A score of 1 on any of these caps the email regardless of its total. */
export const CAPPING_DIMENSIONS: readonly DimensionKey[] = ['trust', 'technical_hygiene'];

export const SCORE_MIN = 1;
export const SCORE_MAX = 5;
export const TOTAL_MAX = DIMENSION_KEYS.length * SCORE_MAX;

export const BANDS = {
  strong: { label: 'Strong', range: '33-40', min: 33 },
  solid: { label: 'Solid', range: '24-32', min: 24 },
  weak: { label: 'Weak', range: 'under 24', min: 0 },
  capped: { label: 'Capped', range: '(a 1 on Trust or Technical hygiene)', min: 0 },
} as const;

export type Band = keyof typeof BANDS;
