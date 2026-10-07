import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { SITE } from '../../config/site';
import { getTeardowns, teardownSlug } from '../../lib/content';

export async function GET(context: APIContext) {
  const teardowns = (await getTeardowns()).filter((t) => !t.data.draft);
  return rss({
    title: `${SITE.name}: the weekly teardown`,
    description: 'One long look at a pattern from the week\'s marketing email scores.',
    site: context.site ?? SITE.url,
    items: teardowns.map((t) => ({
      title: `No. ${t.data.number}: ${t.data.title}`,
      description: t.data.dek,
      pubDate: new Date(`${t.data.date}T13:00:00Z`),
      link: `/teardown/${teardownSlug(t)}/`,
    })),
  });
}
