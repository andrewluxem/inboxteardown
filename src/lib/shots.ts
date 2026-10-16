// Screenshot sizes for the scorecard's <img width height>, read at build time
// from the image header: the first bytes of the Blob URL (a Range request) or
// of the file under public/ for a /shots/ path. Never fails the build: an
// unreadable image falls back to the 375x667 phone viewport the scorer
// captures at, which the browser corrects once the image loads.
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export interface Size {
  width: number;
  height: number;
}

export const FALLBACK_SIZE: Size = { width: 375, height: 667 };
const HEADER_BYTES = 64;
const TIMEOUT_MS = 10_000;

const ascii = (b: Uint8Array, from: number, to: number) => String.fromCharCode(...b.subarray(from, to));
const u16 = (b: Uint8Array, i: number) => b[i]! | (b[i + 1]! << 8);
const u24 = (b: Uint8Array, i: number) => b[i]! | (b[i + 1]! << 8) | (b[i + 2]! << 16);
const u32be = (b: Uint8Array, i: number) => ((b[i]! << 24) | (b[i + 1]! << 16) | (b[i + 2]! << 8) | b[i + 3]!) >>> 0;

/** Width and height from a WebP (VP8, VP8L, VP8X) or PNG header, else null. */
export function imageSize(b: Uint8Array): Size | null {
  if (b.length >= 24 && ascii(b, 1, 4) === 'PNG' && ascii(b, 12, 16) === 'IHDR') {
    return { width: u32be(b, 16), height: u32be(b, 20) };
  }
  if (b.length < 30 || ascii(b, 0, 4) !== 'RIFF' || ascii(b, 8, 12) !== 'WEBP') return null;
  switch (ascii(b, 12, 16)) {
    case 'VP8 ': // lossy: 14-bit sizes after the 3-byte start code
      if (b[23] !== 0x9d || b[24] !== 0x01 || b[25] !== 0x2a) return null;
      return { width: u16(b, 26) & 0x3fff, height: u16(b, 28) & 0x3fff };
    case 'VP8L': {
      if (b[20] !== 0x2f) return null;
      const bits = (b[21]! | (b[22]! << 8) | (b[23]! << 16) | (b[24]! << 24)) >>> 0;
      return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
    }
    case 'VP8X':
      return { width: u24(b, 24) + 1, height: u24(b, 27) + 1 };
    default:
      return null;
  }
}

const cache = new Map<string, Promise<Size>>();

async function headerBytes(ref: string): Promise<Uint8Array> {
  if (ref.startsWith('/shots/')) {
    const buf = await readFile(join(process.cwd(), 'public', ref));
    return new Uint8Array(buf.buffer, buf.byteOffset, Math.min(buf.length, HEADER_BYTES));
  }
  const res = await fetch(ref, {
    headers: { Range: `bytes=0-${HEADER_BYTES - 1}` },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return new Uint8Array(await res.arrayBuffer()).subarray(0, HEADER_BYTES);
}

/** The screenshot's pixel size, or FALLBACK_SIZE when it can't be read. */
export function screenshotSize(ref: string): Promise<Size> {
  let p = cache.get(ref);
  if (!p) {
    p = headerBytes(ref)
      .then((b) => imageSize(b) ?? FALLBACK_SIZE)
      .catch((err: unknown) => {
        console.warn(`screenshot size: ${ref}: ${err instanceof Error ? err.message : String(err)}; using ${FALLBACK_SIZE.width}x${FALLBACK_SIZE.height}`);
        return FALLBACK_SIZE;
      });
    cache.set(ref, p);
  }
  return p;
}
