// Prelaunch check: run after `npm run build` with `npm run prelaunch`.
// Runs every rule, reports ALL failures grouped by rule, and exits 1 if any
// rule failed. Node runs this TypeScript directly (type stripping, Node 22.18+).
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { SITE, SITE_HOST } from '../src/config/site.ts';
import {
  checkFixtureBrands,
  checkFooterContact,
  checkOgImages,
  checkPlaceholders,
  checkPrivacyPage,
  checkRobots,
  checkScriptHosts,
  checkSignupEndpoint,
  checkTodos,
  type Failure,
  type Page,
  type TextFile,
} from './prelaunch-rules.ts';

const ROOT = new URL('..', import.meta.url).pathname;
const DIST = join(ROOT, 'dist');

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)],
  );
}

if (!existsSync(DIST)) {
  console.error('No dist/ directory. Run `npm run build` first.');
  process.exit(1);
}

const TEXT = /\.(astro|ts|mts|mjs|js|md|mdx|css|json|ya?ml)$/;
const srcFiles: TextFile[] = walk(join(ROOT, 'src'))
  .filter((f) => TEXT.test(f))
  .map((f) => ({ path: relative(ROOT, f), text: readFileSync(f, 'utf8') }));
const contentFiles = srcFiles.filter((f) => f.path.startsWith('src/content/'));

const distPaths = walk(DIST).map((f) => relative(DIST, f));
const pages: Page[] = distPaths.filter((p) => p.endsWith('.html')).map((p) => ({ path: p, html: readFileSync(join(DIST, p), 'utf8') }));
const robotsPath = join(DIST, 'robots.txt');

const rules: [string, Failure[]][] = [
  ['No third-party scripts (only the site and Vercel insights)', checkScriptHosts(pages, SITE_HOST)],
  ['No TODO(andrew) left in src/', checkTodos(srcFiles)],
  ['No bracketed placeholders in built pages', checkPlaceholders(pages)],
  ['No fixture brands in src/content/', checkFixtureBrands(contentFiles)],
  ['Privacy page is built', checkPrivacyPage(pages)],
  ['PUBLIC_SIGNUP_ENDPOINT set at build time', checkSignupEndpoint(pages)],
  ['robots.txt allows crawling', checkRobots(existsSync(robotsPath) ? readFileSync(robotsPath, 'utf8') : undefined)],
  ['Every indexable page has an og:image that exists in dist/', checkOgImages(pages, new Set(distPaths), SITE.siteUrl)],
  [`Footer shows ${SITE.contactEmail}`, checkFooterContact(pages, SITE.contactEmail)],
];

const failed = rules.filter(([, f]) => f.length);
console.log(`Prelaunch check: ${pages.length} pages, ${srcFiles.length} source files\n`);
for (const [name, failures] of rules) {
  console.log(`${failures.length ? 'FAIL' : 'PASS'}  ${name}${failures.length ? ` (${failures.length})` : ''}`);
  for (const f of failures) console.log(`        ${f.detail}`);
}
console.log(`\n${failed.length ? `${failed.length} of ${rules.length} rules failed.` : `All ${rules.length} rules passed.`}`);
process.exit(failed.length ? 1 : 0);
