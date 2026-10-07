// TODO(andrew): confirm names from email-quality-rubric-client.md
// Only "Trust" and "Technical hygiene" are confirmed. The keys are part of the
// content contract and must not change; only the display names may.
export const DIMENSIONS = {
  subject_preheader: 'Subject & preheader',
  offer_clarity: 'Offer clarity',
  design_hierarchy: 'Design & hierarchy',
  copy_voice: 'Copy & voice',
  cta: 'CTA',
  personalization: 'Personalization',
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
  capped: { label: 'Capped', range: 'a 1 on Trust or Technical hygiene', min: 0 },
} as const;

export type Band = keyof typeof BANDS;
