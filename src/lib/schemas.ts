// Zod schemas for every content collection. This file IS the content contract
// in executable form; docs/CONTENT-CONTRACT.md describes it for humans.
// Kept free of astro:content imports so Vitest can validate fixtures directly.
import { z } from 'astro/zod';
import { INDUSTRY_KEYS } from '../config/industries';
import { SCORE_MAX, SCORE_MIN } from '../config/rubric';

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Public host suffix of the Vercel Blob store that holds screenshots. */
export const BLOB_HOST_SUFFIX = '.public.blob.vercel-storage.com';

/**
 * A screenshot reference: a path under /shots/ (fixtures, files in
 * public/shots/) or an https URL on a Vercel Blob public host
 * (*.public.blob.vercel-storage.com) with no credentials, port or empty
 * path. Any other URL is refused. Same rule as the scorer's
 * site_schema_check.py.
 */
export function isScreenshotRef(v: string): boolean {
  if (!v || /\s/.test(v)) return false;
  if (/^\/shots\/\S+$/.test(v)) return true;
  let u: URL;
  try {
    u = new URL(v);
  } catch {
    return false;
  }
  return (
    u.protocol === 'https:' &&
    u.hostname.endsWith(BLOB_HOST_SUFFIX) &&
    !u.username &&
    !u.password &&
    u.port === '' &&
    u.pathname.length > 1
  );
}

/**
 * YAML parses unquoted `2026-10-07` as a Date at UTC midnight. Normalize to a
 * plain `YYYY-MM-DD` string so calendar dates never drift across time zones.
 */
export const isoDate = z.preprocess(
  (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : v),
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected a YYYY-MM-DD date'),
);

/** Full timestamps (ISO 8601 with offset). */
export const isoDateTime = z.coerce.date();

export const industrySchema = z.enum(INDUSTRY_KEYS);
export const kindSchema = z.enum(['campaign', 'welcome', 'transactional']);

export const dimensionSchema = z.strictObject({
  score: z.number().int().min(SCORE_MIN).max(SCORE_MAX),
  note: z.string().min(1),
  source: z.enum(['check', 'judgment', 'both']),
});

// strictObject: a missing OR an unknown dimension fails the build.
export const dimensionsSchema = z.strictObject({
  subject_preheader: dimensionSchema,
  offer_clarity: dimensionSchema,
  design_hierarchy: dimensionSchema,
  copy_voice: dimensionSchema,
  cta: dimensionSchema,
  personalization: dimensionSchema,
  trust: dimensionSchema,
  technical_hygiene: dimensionSchema,
});

export const checkSchema = z.strictObject({
  name: z.string().min(1),
  // unverified: the check could not reach a verdict (403, 429, timeout, image-only
  // footer). Rubric v1 never penalizes it, so it renders neutral.
  result: z.enum(['pass', 'fail', 'unverified']),
  detail: z.string().optional(),
});

const emailBase = z.strictObject({
  id: z.string().regex(SLUG, 'id must be lowercase, URL-safe (a-z, 0-9, hyphens)'),
  brand: z.string().min(1),
  brand_slug: z.string().regex(SLUG, 'brand_slug must be lowercase, URL-safe'),
  industry: industrySchema,
  kind: kindSchema,
  sent_at: isoDateTime,
  subject: z.string().min(1),
  preheader: z.string().default(''),
  themes: z.array(z.string().min(1)).default([]),
  dimensions: dimensionsSchema,
  checks: z.array(checkSchema).default([]),
  // A local path under /shots/ or an https URL on the public Blob store
  // (isScreenshotRef). Real screenshots go to Blob, never into git.
  screenshot: z
    .string()
    .refine(
      isScreenshotRef,
      `screenshot must be a path under /shots/ or an https URL on *${BLOB_HOST_SUFFIX}`,
    )
    .nullable()
    .default(null),
  // Set when a score was changed after publication; shown on the scorecard.
  correction: z
    .strictObject({
      date: isoDate,
      note: z.string().min(1),
    })
    .optional(),
});

/**
 * Hard-fail evidence gate. A 1 on a capping dimension (Trust, Technical
 * hygiene) caps the email publicly, so it must be backed by at least one
 * failed check with a non-empty detail. A cap with no evidence fails the build.
 */
export const emailSchema = emailBase.superRefine((e, ctx) => {
  const capped = (['trust', 'technical_hygiene'] as const).filter((k) => e.dimensions[k].score === 1);
  if (!capped.length) return;
  const evidenced = e.checks.some((c) => c.result === 'fail' && (c.detail ?? '').trim().length > 0);
  if (!evidenced) {
    capped.forEach((k) =>
      ctx.addIssue({
        code: 'custom',
        path: ['dimensions', k, 'score'],
        message: `${k} is 1 (capped) but no failed check with a detail backs it`,
      }),
    );
  }
});

export const scoreboardSchema = z
  .strictObject({
    date: isoDate,
    generated_at: isoDateTime,
    rubric_version: z.string().min(1),
    emails: z.array(emailSchema).min(1),
  })
  .superRefine((day, ctx) => {
    const seen = new Set<string>();
    day.emails.forEach((e, i) => {
      if (seen.has(e.id)) {
        ctx.addIssue({ code: 'custom', path: ['emails', i, 'id'], message: `Duplicate email id "${e.id}"` });
      }
      seen.add(e.id);
    });
  });

export const teardownSchema = z.strictObject({
  title: z.string().min(1),
  number: z.number().int().positive(),
  date: isoDate,
  dek: z.string().min(1),
  read_minutes: z.number().int().positive(),
  featured_email_ids: z.array(z.string().regex(SLUG)).default([]),
  draft: z.boolean().default(false),
});

const pct = z.number();

export const trackerSchema = z
  .strictObject({
    slug: z.string().regex(SLUG),
    title: z.string().min(1),
    start: isoDate,
    end: isoDate,
    cohort_frozen: isoDate,
    published: z.boolean().default(false),
    cohort_size: z.number().int().positive(),
    // Additions beyond the original spec; both optional. See CONTENT-CONTRACT.md.
    updated_at: isoDateTime.optional(),
    october_avg_score: z.number().min(8).max(40).optional(),
    days: z.array(
      z.strictObject({
        date: isoDate,
        launched_cumulative: z.number().int().min(0),
        sends: z.number().int().min(0),
        sends_vs_baseline: pct, // percent change vs. baseline, e.g. 42 = +42%
      }),
    ),
    brands: z.array(
      z.strictObject({
        brand: z.string().min(1),
        brand_slug: z.string().regex(SLUG),
        first_mention: isoDate,
        discount: z.number().min(0).max(100).nullable(), // headline % off, null if none
        sends_since: z.number().int().min(0),
        avg_score: z.number().min(8).max(40),
      }),
    ),
    categories: z.array(
      z.strictObject({
        industry: industrySchema,
        sends_vs_baseline: pct,
      }),
    ),
  })
  .superRefine((t, ctx) => {
    t.days.forEach((d, i) => {
      if (d.date < t.start || d.date > t.end) {
        ctx.addIssue({ code: 'custom', path: ['days', i, 'date'], message: `${d.date} is outside ${t.start}..${t.end}` });
      }
      if (d.launched_cumulative > t.cohort_size) {
        ctx.addIssue({ code: 'custom', path: ['days', i, 'launched_cumulative'], message: 'exceeds cohort_size' });
      }
    });
    // In date order, launched_cumulative never goes down (and no date repeats).
    const byDate = t.days.map((d, i) => ({ d, i })).sort((a, b) => a.d.date.localeCompare(b.d.date));
    byDate.forEach(({ d, i }, k) => {
      const prev = byDate[k - 1]?.d;
      if (!prev) return;
      if (prev.date === d.date) {
        ctx.addIssue({ code: 'custom', path: ['days', i, 'date'], message: `${d.date} appears more than once` });
      } else if (d.launched_cumulative < prev.launched_cumulative) {
        ctx.addIssue({
          code: 'custom',
          path: ['days', i, 'launched_cumulative'],
          message: `${d.launched_cumulative} on ${d.date} is less than ${prev.launched_cumulative} on ${prev.date}; it never decreases`,
        });
      }
    });
    // The latest day's launched count is the number of brands listed.
    const launched = byDate.at(-1)?.d.launched_cumulative ?? 0;
    if (launched !== t.brands.length) {
      ctx.addIssue({
        code: 'custom',
        path: ['brands'],
        message: `${t.brands.length} brands listed but the latest launched_cumulative is ${launched}; they must match`,
      });
    }
    t.brands.forEach((b, i) => {
      if (b.first_mention < t.start) {
        ctx.addIssue({ code: 'custom', path: ['brands', i, 'first_mention'], message: `${b.first_mention} is before start ${t.start}` });
      }
    });
  });

export const pageSchema = z.strictObject({
  title: z.string().min(1),
  description: z.string().min(1),
  rubric_version: z.string().optional(),
  rubric_date: z.string().optional(),
});

/**
 * src/data/brand-redirects.json, copied from the scorer
 * (audit/proposals/brand-redirects.json). Old email and brand page paths to
 * their registry paths. Which entries go live is decided at build time by
 * src/lib/redirects.ts, never by this file alone.
 */
const PAGE_PATH = /^\/(email|brand)\/[a-z0-9]+(?:-[a-z0-9]+)*\/$/;
export const brandRedirectSchema = z.strictObject({
  source: z.string().regex(PAGE_PATH, 'source must be /email/<id>/ or /brand/<slug>/'),
  destination: z.string().regex(PAGE_PATH, 'destination must be /email/<id>/ or /brand/<slug>/'),
  permanent: z.literal(true),
});

export const brandRedirectsSchema = z
  .strictObject({
    _note: z.string().min(1),
    email_pages: z.number().int().min(0),
    brand_pages: z.number().int().min(0),
    suppressed_sends_left_out: z.number().int().min(0),
    not_in_registry: z.array(z.string()),
    redirects: z.array(brandRedirectSchema),
  })
  .superRefine((m, ctx) => {
    const kind = (path: string) => path.split('/')[1];
    const sources = new Set(m.redirects.map((r) => r.source));
    const seen = new Set<string>();
    m.redirects.forEach((r, i) => {
      const at = (key: string) => ['redirects', i, key];
      if (seen.has(r.source)) ctx.addIssue({ code: 'custom', path: at('source'), message: `Duplicate source ${r.source}` });
      seen.add(r.source);
      if (r.source === r.destination) ctx.addIssue({ code: 'custom', path: at('destination'), message: `${r.source} redirects to itself` });
      if (kind(r.source) !== kind(r.destination)) {
        ctx.addIssue({ code: 'custom', path: at('destination'), message: `${r.source} and ${r.destination} are different page types` });
      }
      if (sources.has(r.destination)) {
        ctx.addIssue({ code: 'custom', path: at('destination'), message: `${r.destination} is itself a redirect source (a chain)` });
      }
    });
    const count = (k: string) => m.redirects.filter((r) => kind(r.source) === k).length;
    if (count('email') !== m.email_pages) {
      ctx.addIssue({ code: 'custom', path: ['email_pages'], message: `email_pages is ${m.email_pages} but ${count('email')} email redirects are listed` });
    }
    if (count('brand') !== m.brand_pages) {
      ctx.addIssue({ code: 'custom', path: ['brand_pages'], message: `brand_pages is ${m.brand_pages} but ${count('brand')} brand redirects are listed` });
    }
  });

export type Email = z.infer<typeof emailSchema>;
export type ScoreboardDay = z.infer<typeof scoreboardSchema>;
export type Teardown = z.infer<typeof teardownSchema>;
export type Tracker = z.infer<typeof trackerSchema>;
export type Dimensions = z.infer<typeof dimensionsSchema>;
export type BrandRedirects = z.infer<typeof brandRedirectsSchema>;
export type CheckResult = z.infer<typeof checkSchema>['result'];
