// Prelaunch check over the built site. Run after `npm run build`:
//   npm run prelaunch
// Exits non-zero when any rule fails.
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { thirdPartyScripts } from './prelaunch-rules.mjs';

// Keep in sync with `site` in astro.config.mjs.
const SITE_HOST = 'inboxteardown.com';
const DIST = new URL('../dist/', import.meta.url).pathname;

function htmlFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? htmlFiles(join(dir, e.name)) : e.name.endsWith('.html') ? [join(dir, e.name)] : [],
  );
}

let files;
try {
  files = htmlFiles(DIST);
} catch {
  console.error('No dist/ directory. Run `npm run build` first.');
  process.exit(1);
}

const failures = [];
for (const file of files) {
  for (const src of thirdPartyScripts(readFileSync(file, 'utf8'), SITE_HOST)) {
    failures.push(`${relative(DIST, file)}: <script src="${src}"> loads from outside ${SITE_HOST}`);
  }
}

if (failures.length) {
  console.error(`Prelaunch check failed: third-party scripts (only Vercel Web Analytics is allowed)\n`);
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}
console.log(`Prelaunch check passed: ${files.length} HTML files, no third-party <script src>.`);
