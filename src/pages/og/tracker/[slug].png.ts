import type { APIContext, GetStaticPaths } from 'astro';
import { CURRENT_TRACKER, CURRENT_TRACKER_START, getTrackers } from '../../../lib/content';
import { formatShort } from '../../../lib/dates';
import { pngResponse, renderOgPng } from '../../../lib/og';
import type { Tracker } from '../../../lib/schemas';
import { dayLabel, showsData, trackerProgress } from '../../../lib/tracker';

// One image per tracker page, including the pre-start page built while the
// current tracker has no content file. Until data may be shown (published
// with a day of data) it says "Starts Nov 2".
export const getStaticPaths = (async () => {
  const trackers = await getTrackers();
  const paths: { params: { slug: string }; props: { tracker?: Tracker } }[] =
    trackers.map((t) => ({ params: { slug: t.data.slug }, props: { tracker: t.data } }));
  if (!trackers.some((t) => t.data.slug === CURRENT_TRACKER)) {
    paths.push({ params: { slug: CURRENT_TRACKER }, props: {} });
  }
  return paths;
}) satisfies GetStaticPaths;

export async function GET({ props }: APIContext<{ tracker?: Tracker }>) {
  const t = props.tracker;
  const start = t?.start ?? CURRENT_TRACKER_START;
  const title = t?.title ?? `Black Friday ${start.slice(0, 4)} tracker`;
  if (!showsData(t)) {
    return pngResponse(
      await renderOgPng({
        eyebrow: title,
        headline: [{ text: 'Starts ' }, { text: formatShort(start), accent: true }],
      }),
    );
  }
  const { launched } = trackerProgress(t);
  return pngResponse(
    await renderOgPng({
      eyebrow: `${t.title} · ${dayLabel(start, t)}`,
      headline: [{ text: `${launched} of ${t.cohort_size}`, accent: true }, { text: 'brands have started Black Friday' }],
    }),
  );
}
