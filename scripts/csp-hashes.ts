// The sha256 sources of every inline script in dist/, for the CSP's
// script-src in vercel.json. Run after `npm run build`:
//   npm run csp:hashes             print them, exit 1 if one is missing
//   npm run csp:hashes -- --write  add the missing ones to script-src
//   ... -- --write --prune         also drop hashes not in dist/
// Keep the Vercel build's own hashes: on Vercel, @vercel/analytics inlines
// the project's PUBLIC_VERCEL_OBSERVABILITY_CLIENT_CONFIG, so its script
// (and hash) differs from a local build's. Both are in script-src; the
// Vercel one is taken from a deployed page (it is the same on every
// deployment of the project), and --write never drops it without --prune.
// Node runs this TypeScript directly (type stripping, Node 22.18+).
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { cspFromVercelJson, cspSources, inlineScriptHashes } from './prelaunch-rules.ts';

const ROOT = new URL('..', import.meta.url).pathname;
const DIST = join(ROOT, 'dist');
const VERCEL_JSON = join(ROOT, 'vercel.json');

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)],
  );
}

if (!existsSync(DIST)) {
  console.error('No dist/ directory. Run `npm run build` first.');
  process.exit(1);
}
const hashes = [...new Set(walk(DIST).filter((f) => f.endsWith('.html')).flatMap((f) => inlineScriptHashes(readFileSync(f, 'utf8'))))].sort();
const text = readFileSync(VERCEL_JSON, 'utf8');
const csp = cspFromVercelJson(text);
if (!csp) {
  console.error('vercel.json sets no Content-Security-Policy for "/(.*)"');
  process.exit(1);
}
const prune = process.argv.includes('--prune');
const have = cspSources(csp, 'script-src');
const extra = have.filter((h) => h.startsWith("'sha256-") && !hashes.includes(h));
const want = ["'self'", ...[...hashes, ...(prune ? [] : extra)].sort()];
for (const h of hashes) console.log(`${have.includes(h) ? '  ' : '+ '}${h}`);
for (const h of extra) console.log(`${prune ? '- ' : '= '}${h}  (not in dist/${prune ? '' : ', kept'})`);
if (want.join(' ') === have.join(' ') || (!process.argv.includes('--write') && hashes.every((h) => have.includes(h)))) {
  console.log('vercel.json script-src is up to date.');
} else if (process.argv.includes('--write')) {
  const next = csp.replace(/script-src[^;]*/, `script-src ${want.join(' ')}`);
  writeFileSync(VERCEL_JSON, text.replace(csp, next));
  console.log('vercel.json script-src updated.');
} else {
  console.log('vercel.json script-src lacks a hash; run with --write to add it.');
  process.exit(1);
}
