// Full-page screenshots of key routes at desktop and phone widths, for PR
// review. Run after `npm run build`: `npm run screenshots`.
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const PORT = 4329;
const BASE = `http://localhost:${PORT}`;
const OUT = new URL('../docs/screenshots/', import.meta.url);
const WIDTHS = [1280, 390];
const PAGES = [
  ['home', '/'],
  ['scorecard', '/email/2026-10-06-kestrel-outdoor-1/'],
  ['brand', '/brand/kestrel-outdoor/'],
  ['teardown-archive', '/teardown/'],
  ['tracker', '/tracker/black-friday-2026/'],
  ['privacy', '/privacy/'],
];

const server = spawn('npx', ['astro', 'preview', '--port', String(PORT)], { stdio: 'ignore' });

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(BASE)).ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('preview server did not start');
}

try {
  await waitForServer();
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  for (const width of WIDTHS) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
    for (const [name, path] of PAGES) {
      await page.goto(BASE + path, { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      const file = new URL(`${name}-${width}.png`, OUT);
      await page.screenshot({ path: file.pathname, fullPage: true });
      console.log('saved', file.pathname);
    }
    await page.close();
  }
  await browser.close();
} finally {
  server.kill();
}
