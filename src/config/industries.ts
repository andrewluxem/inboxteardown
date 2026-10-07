// Industry keys are part of the content contract. Keys are what the pipeline
// writes; labels are what the site shows.
export const INDUSTRIES = {
  ecommerce: 'E-commerce',
  fashion: 'Fashion',
  food: 'Food',
  travel: 'Travel',
  home: 'Home',
  saas: 'SaaS',
  media: 'Media',
  finance: 'Finance',
  health: 'Health',
  other: 'Other',
} as const;

export type IndustryKey = keyof typeof INDUSTRIES;

export const INDUSTRY_KEYS = Object.keys(INDUSTRIES) as [IndustryKey, ...IndustryKey[]];

export function industryLabel(key: IndustryKey): string {
  return INDUSTRIES[key];
}
