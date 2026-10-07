import { SITE } from '../../config/site';
import { pngResponse, renderOgPng } from '../../lib/og';

export async function GET() {
  return pngResponse(await renderOgPng({ headline: [{ text: SITE.tagline }] }));
}
