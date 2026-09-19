import { describe, it, expect } from 'vitest';
import {
  avatarSources,
  bannerSources,
  BANNER_SIZES,
  PORTRAIT_SIZES,
  YT_BANNER_SIZES,
} from '../wiki';

// Perf round 2026-09-19: the responsive hero/portrait sources are pure string
// rewrites. The URL shapes below are the ones found in streamers.banner_url /
// avatar_url in production (696 Twitch 1920 banners, 20 Twitch legacy, 151
// YouTube bare, 105 NULL).

const TWITCH_BASE = 'https://static-cdn.jtvnw.net/jtv_user_pictures/';
const YT_CROP = '-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj';

function widthsOf(srcSet: string | null): number[] {
  return (srcSet ?? '').split(', ').map((c) => Number(c.split(' ')[1].replace(/w$/, '')));
}

describe('bannerSources — Twitch offline screens', () => {
  const shapes = [
    `${TWITCH_BASE}abc-channel_offline_image-1920x1080.png`,
    `${TWITCH_BASE}abc-channel_offline_image-1920x1080.jpeg`,
    `${TWITCH_BASE}abc-channel_offline_image-1920x1080.jpg`,
    `${TWITCH_BASE}abc-channel_offline_image-a1b2c3d4-1920x1080.png`,
    `${TWITCH_BASE}abc-channel_offline_image-a1b2c3d4-1920x1080.jpeg`,
    `${TWITCH_BASE}deadbeef-1234-channel_offline_image-99ff00aa-1920x1080.jpg`,
  ];

  it.each(shapes)('builds a 16:9 candidate ladder for %s', (url) => {
    const out = bannerSources(url);
    expect(out).not.toBeNull();
    expect(widthsOf(out!.srcSet)).toEqual([640, 828, 1024, 1280, 1920]);
    expect(out!.sizes).toBe(BANNER_SIZES);
    // Fallback is the 1280 candidate, heights follow 16:9.
    expect(out!.src).toBe(url.replace('1920x1080', '1280x720'));
    expect(out!.width).toBe(1280);
    expect(out!.height).toBe(720);
    expect(out!.srcSet).toContain(url.replace('1920x1080', '828x466') + ' 828w');
    expect(out!.srcSet).toContain(url.replace('1920x1080', '640x360') + ' 640w');
    // The stored file itself stays the largest candidate.
    expect(out!.srcSet).toContain(`${url} 1920w`);
  });

  it('never asks for more than the stored width (upscaling distorts)', () => {
    const out = bannerSources(`${TWITCH_BASE}abc-channel_offline_image-1280x720.png`);
    expect(widthsOf(out!.srcSet)).toEqual([640, 828, 1024, 1280]);
    expect(out!.src).toBe(`${TWITCH_BASE}abc-channel_offline_image-1280x720.png`);
  });

  it('falls back to the smallest candidate when the stored width is below 1280', () => {
    const out = bannerSources(`${TWITCH_BASE}abc-channel_offline_image-800x450.png`);
    expect(widthsOf(out!.srcSet)).toEqual([640]);
    expect(out!.src).toBe(`${TWITCH_BASE}abc-channel_offline_image-640x360.png`);
    expect(out!.width).toBe(640);
    expect(out!.height).toBe(360);
  });

  it('serves a stored width below every candidate unchanged, without srcset', () => {
    const url = `${TWITCH_BASE}abc-channel_offline_image-320x180.png`;
    expect(bannerSources(url)).toEqual({
      src: url,
      srcSet: null,
      sizes: null,
      width: 320,
      height: 180,
    });
  });

  it('keeps a non-16:9 stored ratio instead of forcing 16:9', () => {
    const out = bannerSources(`${TWITCH_BASE}abc-channel_offline_image-1920x1200.png`);
    expect(out!.srcSet).toContain('-1024x640.png');
    expect(out!.srcSet).toContain('-1280x800.png');
    expect(out!.height).toBe(800);
  });

  it('leaves Twitch profile images alone (fixed buckets, arbitrary sizes 404)', () => {
    const url = `${TWITCH_BASE}abc-profile_image-300x300.png`;
    expect(bannerSources(url)).toEqual({ src: url, srcSet: null, sizes: null, width: 1920, height: 1080 });
  });
});

describe('bannerSources — YouTube banners', () => {
  it('turns a bare banner into the 6:1 desktop-crop ladder', () => {
    const out = bannerSources('https://yt3.googleusercontent.com/AbCdEf');
    expect(widthsOf(out!.srcSet)).toEqual([1060, 1280, 2120, 2560]);
    expect(out!.src).toBe(`https://yt3.googleusercontent.com/AbCdEf=w1280${YT_CROP}`);
    expect(out!.srcSet).toContain(`https://yt3.googleusercontent.com/AbCdEf=w2120${YT_CROP} 2120w`);
    expect(out!.sizes).toBe(YT_BANNER_SIZES);
    // 1280 wide → 212 px crop (measured 1280x212 on the CDN).
    expect(out!.width).toBe(1280);
    expect(out!.height).toBe(212);
  });

  it('accepts the ggpht host too', () => {
    const out = bannerSources('https://yt3.ggpht.com/AbCdEf');
    expect(out!.srcSet).not.toBeNull();
    expect(out!.src.startsWith('https://yt3.ggpht.com/AbCdEf=w1280')).toBe(true);
  });

  it('never appends a directive twice: a URL that carries one is served as is', () => {
    const url = 'https://yt3.googleusercontent.com/AbCdEf=w1707';
    expect(bannerSources(url)).toEqual({ src: url, srcSet: null, sizes: null, width: 1920, height: 1080 });
  });
});

describe('bannerSources — edge cases', () => {
  it('returns null for no banner', () => {
    expect(bannerSources(null)).toBeNull();
    expect(bannerSources('')).toBeNull();
  });

  it('passes unknown hosts through unchanged', () => {
    const url = 'https://example.com/banner.png';
    expect(bannerSources(url)).toEqual({ src: url, srcSet: null, sizes: null, width: 1920, height: 1080 });
  });

  it('is deterministic (ISR byte-determinism)', () => {
    const url = `${TWITCH_BASE}abc-channel_offline_image-1920x1080.png`;
    expect(bannerSources(url)).toEqual(bannerSources(url));
  });
});

describe('avatarSources', () => {
  it('offers the three Twitch buckets the CDN really serves, 300 as fallback', () => {
    const out = avatarSources(`${TWITCH_BASE}abc-123-profile_image-300x300.png`);
    expect(widthsOf(out!.srcSet)).toEqual([150, 300, 600]);
    expect(out!.src).toBe(`${TWITCH_BASE}abc-123-profile_image-300x300.png`);
    expect(out!.srcSet).toContain(`${TWITCH_BASE}abc-123-profile_image-600x600.png 600w`);
    expect(out!.sizes).toBe(PORTRAIT_SIZES);
    expect(out!.width).toBe(300);
    expect(out!.height).toBe(300);
  });

  it('offers finer YouTube steps via =s, keeping the stored suffix', () => {
    const out = avatarSources('https://yt3.googleusercontent.com/xyz=s176-c-k-c0x00ffffff-no-rj');
    expect(widthsOf(out!.srcSet)).toEqual([224, 320, 448, 600]);
    expect(out!.src).toBe('https://yt3.googleusercontent.com/xyz=s448-c-k-c0x00ffffff-no-rj');
    expect(out!.srcSet).toContain('https://yt3.googleusercontent.com/xyz=s320-c-k-c0x00ffffff-no-rj 320w');
    expect(out!.width).toBe(448);
  });

  it('passes unknown shapes through and returns null for none', () => {
    expect(avatarSources('https://example.com/pic.png')).toEqual({
      src: 'https://example.com/pic.png',
      srcSet: null,
      sizes: null,
      width: 600,
      height: 600,
    });
    expect(avatarSources(null)).toBeNull();
  });
});
