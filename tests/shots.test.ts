import { describe, expect, it } from 'vitest';
import { imageSize } from '../src/lib/shots';

const hex = (h: string) => Uint8Array.from(h.match(/../g)!.map((x) => parseInt(x, 16)));

describe('imageSize reads the header the scorer writes', () => {
  it('lossy WebP (VP8): a 375x6000 capture', () => {
    expect(imageSize(hex('52494646fa2f05005745425056503820ee2f0500b08b0b9d012a770170173e6d'))).toEqual({ width: 375, height: 6000 });
  });
  it('lossless WebP (VP8L)', () => {
    expect(imageSize(hex('5249464638000000574542505650384c2b0000002f76413401071011fd0f2868'))).toEqual({ width: 375, height: 1234 });
  });
  it('extended WebP (VP8X)', () => {
    expect(imageSize(hex('52494646ca06000057454250565038580a00000010000000760100280900414c'))).toEqual({ width: 375, height: 2345 });
  });
  it('PNG', () => {
    expect(imageSize(hex('89504e470d0a1a0a0000000d49484452000001770000029b'))).toEqual({ width: 375, height: 667 });
  });
  it('anything else is null', () => {
    expect(imageSize(hex('ffd8ffe000104a46494600010100000100010000ffdb004300'))).toBeNull();
    expect(imageSize(new Uint8Array())).toBeNull();
  });
});
