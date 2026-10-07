// robots.txt is generated so the sitemap URL comes from src/config/site.ts.
// Pre-launch it disallows everything. To launch, set `allowIndexing: true`
// in src/config/site.ts. Unpublished trackers stay out of the index either
// way: they carry noindex and are excluded from the sitemap.
import { SITE } from '../config/site';

export function GET() {
  const body = SITE.allowIndexing
    ? `User-agent: *\nAllow: /\n\nSitemap: ${new URL('/sitemap-index.xml', SITE.siteUrl)}\n`
    : `# Pre-launch: all crawling blocked. Set allowIndexing: true in src/config/site.ts to launch.\nUser-agent: *\nDisallow: /\n`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
