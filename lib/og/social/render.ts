// Renders a SocialCardSpec to PNG (Satori via next/og) or JPEG (sharp).
// Server-only: pulls next/og, the font files and sharp.

import { ImageResponse } from 'next/og';
import { createElement } from 'react';
import sharp from 'sharp';
import { loadOgAvatar } from '@/lib/og/avatar';
import { initialsFromName } from '@/components/web/InitialsAvatar';
import { socialFonts } from './fonts';
import { ListCard } from './list-card';
import { MomentCard } from './moment-card';
import { SOCIAL_CARD_SIZE, type SocialCardSpec } from './types';

export type SocialCardFormat = 'jpeg' | 'png';

export interface RenderedSocialCard {
  bytes: Buffer;
  contentType: 'image/jpeg' | 'image/png';
  /** Avatars that fell back to the initials badge (row index / 'moment'). */
  avatarFallbacks: string[];
}

export const JPEG_QUALITY = 90;

async function avatarsFor(urls: Array<string | null>): Promise<Array<string | null>> {
  return Promise.all(urls.map((u) => loadOgAvatar(u)));
}

export async function renderSocialCard(spec: SocialCardSpec, format: SocialCardFormat = 'jpeg'): Promise<RenderedSocialCard> {
  const fonts = await socialFonts();
  const fallbacks: string[] = [];
  let element;
  if (spec.layout === 'list') {
    const avatars = await avatarsFor(spec.rows.map((r) => r.avatar_url));
    avatars.forEach((a, i) => {
      if (!a) fallbacks.push(String(i));
    });
    element = createElement(ListCard, { spec, avatars, initials: spec.rows.map((r) => initialsFromName(r.name)) });
  } else {
    const [avatar] = await avatarsFor([spec.avatar_url]);
    if (!avatar) fallbacks.push('moment');
    element = createElement(MomentCard, { spec, avatar, initials: initialsFromName(spec.name) });
  }

  const png = new ImageResponse(element, {
    ...SOCIAL_CARD_SIZE,
    fonts: fonts.map((f) => ({ name: f.name, data: f.data, weight: f.weight, style: f.style })),
  });
  const pngBytes = Buffer.from(await png.arrayBuffer());
  if (format === 'png') return { bytes: pngBytes, contentType: 'image/png', avatarFallbacks: fallbacks };
  // Instagram accepts JPEG only. mozjpeg keeps the flat dark canvas clean at
  // a fraction of the PNG size (~200–400 KB instead of 1.5 MB).
  const jpeg = await sharp(pngBytes).jpeg({ quality: JPEG_QUALITY, mozjpeg: true }).toBuffer();
  return { bytes: jpeg, contentType: 'image/jpeg', avatarFallbacks: fallbacks };
}
