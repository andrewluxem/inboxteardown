// Build-time Open Graph images (1200x630 PNG) via satori + resvg.
// Satori reads TTF/OTF/WOFF, not WOFF2, and ignores variable-font axes, so the
// condensed display face is the static Archivo Narrow 700 cut rather than the
// Archivo variable font the site uses with font-stretch.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import type SatoriFn from 'satori';
import type { Resvg as ResvgClass } from '@resvg/resvg-js';
import { SITE_HOST } from '../config/site';

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

const C = {
  ink: '#111318',
  ink2: '#33384A',
  onDark: '#F4F5F7',
  onDarkMuted: '#C9CDD6',
  accentOnDark: '#E2683C',
};

const requireCjs = createRequire(import.meta.url);
const font = (spec: string) => readFileSync(requireCjs.resolve(spec));
// Load the CommonJS builds: satori 0.36's ESM build references __dirname while
// initializing its wasm and throws under Node ESM.
const satori: typeof SatoriFn = requireCjs('satori').default;
const { Resvg }: { Resvg: typeof ResvgClass } = requireCjs('@resvg/resvg-js');

let fonts: Parameters<typeof satori>[1]['fonts'] | undefined;
function loadFonts() {
  fonts ??= [
    { name: 'Archivo Narrow', data: font('@fontsource/archivo-narrow/files/archivo-narrow-latin-700-normal.woff'), weight: 700, style: 'normal' },
    { name: 'IBM Plex Mono', data: font('@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-500-normal.woff'), weight: 500, style: 'normal' },
    { name: 'IBM Plex Mono', data: font('@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-600-normal.woff'), weight: 600, style: 'normal' },
  ];
  return fonts;
}

type Node = { type: string; props: Record<string, unknown> & { style?: Record<string, unknown>; children?: unknown } };
const el = (type: string, style: Record<string, unknown>, children?: unknown): Node => ({ type, props: { style, children } });

export interface OgSpec {
  eyebrow?: string;
  /** Headline segments; `accent` segments render in rust. */
  headline: { text: string; accent?: boolean }[];
  /** Optional mono stat in the footer row, e.g. "29.6/40 average". */
  stat?: string;
}

function headlineSize(chars: number): number {
  if (chars <= 26) return 124;
  if (chars <= 44) return 104;
  return 84;
}

export function ogTree(spec: OgSpec): Node {
  const chars = spec.headline.reduce((n, s) => n + s.text.length, 0);
  const size = headlineSize(chars);
  const mono = { fontFamily: 'IBM Plex Mono', textTransform: 'uppercase', letterSpacing: 2 };

  const wordmark = el('div', { display: 'flex', fontFamily: 'Archivo Narrow', fontWeight: 700, fontSize: 40, color: C.onDark, letterSpacing: 1 }, [
    el('span', {}, 'INBOX'),
    el('span', { color: C.accentOnDark }, '/'),
    el('span', {}, 'TEARDOWN'),
  ]);

  const middle = el('div', { display: 'flex', flexDirection: 'column' }, [
    ...(spec.eyebrow ? [el('div', { ...mono, fontWeight: 500, fontSize: 26, color: C.onDarkMuted, marginBottom: 22 }, spec.eyebrow)] : []),
    el(
      'div',
      { display: 'flex', flexWrap: 'wrap', fontFamily: 'Archivo Narrow', fontWeight: 700, fontSize: size, lineHeight: 0.95, textTransform: 'uppercase', color: C.onDark },
      // One flex item per word, so the headline wraps and accent words keep their color.
      spec.headline
        .flatMap((s) => s.text.trim().split(/\s+/).map((word) => ({ word, accent: s.accent })))
        .map(({ word, accent }) => el('span', { color: accent ? C.accentOnDark : C.onDark, marginRight: Math.round(size * 0.24) }, word)),
    ),
  ]);

  const footer = el('div', { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: `2px solid ${C.ink2}`, paddingTop: 24 }, [
    el('div', { ...mono, fontWeight: 600, fontSize: 30, color: C.onDark }, spec.stat ?? ''),
    el('div', { ...mono, fontWeight: 500, fontSize: 22, color: C.onDarkMuted, letterSpacing: 1, textTransform: 'none' }, SITE_HOST),
  ]);

  return el(
    'div',
    { width: OG_WIDTH, height: OG_HEIGHT, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', backgroundColor: C.ink, padding: '60px 72px 52px' },
    [wordmark, middle, footer],
  );
}

export async function renderOgPng(spec: OgSpec): Promise<Uint8Array> {
  const svg = await satori(ogTree(spec) as unknown as Parameters<typeof satori>[0], { width: OG_WIDTH, height: OG_HEIGHT, fonts: loadFonts() });
  return new Resvg(svg, { fitTo: { mode: 'width', value: OG_WIDTH } }).render().asPng();
}

export function pngResponse(png: Uint8Array): Response {
  return new Response(png as BodyInit, { headers: { 'Content-Type': 'image/png' } });
}

/** Path of each OG image variant; pages pass these to the layout. */
export const ogPath = {
  default: '/og/default.png',
  home: '/og/home.png',
  teardown: (slug: string) => `/og/teardown/${slug}.png`,
  tracker: (slug: string) => `/og/tracker/${slug}.png`,
};
