// Inter Regular + Bold for the social cards. Satori's bundled default is Geist
// Regular only (Latin, no bold), so headlines need real font files. Bundled
// under lib/og/fonts (OFL) and read from disk in the Node runtime; the route
// is traced with outputFileTracingIncludes in next.config.ts so the TTFs ship
// inside the serverless function.

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export interface SocialFont {
  name: string;
  data: ArrayBuffer;
  weight: 400 | 700;
  style: 'normal';
}

let cache: Promise<SocialFont[]> | null = null;

async function load(file: string, weight: 400 | 700): Promise<SocialFont> {
  const buf = await readFile(join(process.cwd(), 'lib', 'og', 'fonts', file));
  return { name: 'Inter', data: buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer, weight, style: 'normal' };
}

export function socialFonts(): Promise<SocialFont[]> {
  if (!cache) {
    cache = Promise.all([load('Inter-Regular.ttf', 400), load('Inter-Bold.ttf', 700)]).catch((err) => {
      cache = null;
      throw err;
    });
  }
  return cache;
}
