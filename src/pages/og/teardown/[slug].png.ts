import type { APIContext, GetStaticPaths } from 'astro';
import { getTeardowns, teardownSlug, type TeardownEntry } from '../../../lib/content';
import { pngResponse, renderOgPng } from '../../../lib/og';

export const getStaticPaths = (async () =>
  (await getTeardowns()).map((t) => ({ params: { slug: teardownSlug(t) }, props: { teardown: t } }))) satisfies GetStaticPaths;

export async function GET({ props }: APIContext<{ teardown: TeardownEntry }>) {
  const t = props.teardown.data;
  return pngResponse(await renderOgPng({ eyebrow: `Teardown No. ${t.number}`, headline: [{ text: t.title }] }));
}
