import type { APIContext, GetStaticPaths } from 'astro';
import { getTrackers } from '../../../lib/content';
import { pngResponse, renderOgPng } from '../../../lib/og';
import type { Tracker } from '../../../lib/schemas';
import { trackerProgress } from '../../../lib/tracker';

export const getStaticPaths = (async () =>
  (await getTrackers()).map((t) => ({ params: { slug: t.data.slug }, props: { tracker: t.data } }))) satisfies GetStaticPaths;

export async function GET({ props }: APIContext<{ tracker: Tracker }>) {
  const t = props.tracker;
  const { dayN, totalDays, launched } = trackerProgress(t);
  return pngResponse(
    await renderOgPng({
      eyebrow: `${t.title} · Day ${dayN} of ${totalDays}`,
      headline: [{ text: `${launched} of ${t.cohort_size}`, accent: true }, { text: 'brands have started Black Friday' }],
    }),
  );
}
