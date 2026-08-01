import { describe, it, expect } from 'vitest';
import { sizedAvatarUrl, sizedCdnImageUrl } from '../image-size';

const YT = 'https://yt3.ggpht.com/ytc/AIdro_nBvD2_i9JPqMIZoH-3Pct438PAEd1d4rLEd1LCCLEEmKc=s800-c-k-c0x00ffffff-no-rj';
const YT_BASE = 'https://yt3.ggpht.com/ytc/AIdro_nBvD2_i9JPqMIZoH-3Pct438PAEd1d4rLEd1LCCLEEmKc';
const TWITCH_AVATAR = 'https://static-cdn.jtvnw.net/jtv_user_pictures/5742b015-e6ed-4f7c-a1dd-87cd88fe1eb9-profile_image-300x300.png';
const PREVIEW = 'https://static-cdn.jtvnw.net/previews-ttv/live_user_jynxzi-440x248.jpg';
const BOXART = 'https://static-cdn.jtvnw.net/ttv-boxart/509658-285x380.jpg';

describe('sizedAvatarUrl — YouTube', () => {
  it('replaces the whole parameter string with the requested size', () => {
    // 28px circle at DPR 2 -> s56. Verified against the CDN: s800 = 51 KB,
    // s88 = 2.8 KB, s64 = 2.1 KB.
    expect(sizedAvatarUrl(YT, 28)).toBe(`${YT_BASE}=s56-c-k-c0x00ffffff-no-rj`);
    expect(sizedAvatarUrl(YT, 40)).toBe(`${YT_BASE}=s80-c-k-c0x00ffffff-no-rj`);
    expect(sizedAvatarUrl(YT, 96)).toBe(`${YT_BASE}=s192-c-k-c0x00ffffff-no-rj`);
  });

  it('adds a size to a URL that carries no parameters yet', () => {
    expect(sizedAvatarUrl(YT_BASE, 32)).toBe(`${YT_BASE}=s64-c-k-c0x00ffffff-no-rj`);
  });

  it('never asks for more than the stored size', () => {
    // Stored s800; a 600px box at DPR 2 wants 1200 -> capped back to 800.
    expect(sizedAvatarUrl(YT, 600)).toBe(`${YT_BASE}=s800-c-k-c0x00ffffff-no-rj`);
  });

  it('is idempotent — re-sizing an already-sized URL is not cumulative', () => {
    const once = sizedAvatarUrl(YT, 28)!;
    expect(sizedAvatarUrl(once, 28)).toBe(once);
  });

  it('covers the other YouTube avatar hosts', () => {
    for (const host of ['yt4.ggpht.com', 'lh3.googleusercontent.com']) {
      const url = `https://${host}/abc=s800-c-k-c0x00ffffff-no-rj`;
      expect(sizedAvatarUrl(url, 20)).toBe(`https://${host}/abc=s40-c-k-c0x00ffffff-no-rj`);
    }
  });
});

describe('sizedAvatarUrl — Twitch', () => {
  // Twitch profile images exist ONLY in fixed buckets; an arbitrary size 404s,
  // which is why this path snaps up instead of computing a size.
  it.each([
    [12, 28],
    [14, 28],
    [20, 50],
    [28, 70],
    [32, 70],
    [40, 150],
    [64, 150],
    [96, 300],
    [150, 300],
  ])('snaps a %ipx box up to the %ix%i bucket', (cssPx, bucket) => {
    expect(sizedAvatarUrl(TWITCH_AVATAR, cssPx)).toBe(
      TWITCH_AVATAR.replace('300x300', `${bucket}x${bucket}`),
    );
  });

  // Without this cap the helper would make pages BIGGER: an avatar rendered
  // into a wide box (the blurred thumbnail fallback asks for ~268px) resolves
  // to the 600x600 bucket, which is 298 KB against the stored 112 KB.
  it.each([200, 268, 400])(
    'never asks for a bigger variant than the stored one (%ipx box)',
    (cssPx) => {
      expect(sizedAvatarUrl(TWITCH_AVATAR, cssPx)).toBe(TWITCH_AVATAR);
    },
  );

  it('still snaps down from a stored 600x600', () => {
    const big = TWITCH_AVATAR.replace('300x300', '600x600');
    expect(sizedAvatarUrl(big, 28)).toBe(big.replace('600x600', '70x70'));
    expect(sizedAvatarUrl(big, 400)).toBe(big);
  });

  it('is idempotent', () => {
    const once = sizedAvatarUrl(TWITCH_AVATAR, 28)!;
    expect(sizedAvatarUrl(once, 28)).toBe(once);
  });

  it('leaves a profile URL without dimensions alone', () => {
    const odd = 'https://static-cdn.jtvnw.net/jtv_user_pictures/abc-profile_image.png';
    expect(sizedAvatarUrl(odd, 28)).toBe(odd);
  });
});

describe('sizedAvatarUrl — pass-through', () => {
  it.each([
    ['null', null],
    ['undefined', undefined],
    ['empty', ''],
  ])('returns null for %s', (_label, input) => {
    expect(sizedAvatarUrl(input, 28)).toBeNull();
  });

  it('never touches data/blob URLs or unknown hosts', () => {
    const data = 'data:image/png;base64,iVBORw0KGgo=';
    const other = 'https://cdn.example.com/avatar.png';
    expect(sizedAvatarUrl(data, 28)).toBe(data);
    expect(sizedAvatarUrl(other, 28)).toBe(other);
  });
});

describe('sizedCdnImageUrl', () => {
  it('scales a live preview and keeps its aspect ratio exactly', () => {
    // 268px card at DPR 2 -> 536 > 440 stored, so no change (see upscale rule).
    expect(sizedCdnImageUrl(PREVIEW, 268)).toBe(PREVIEW);
    // 120px -> 240 wide, 248/440 * 240 = 135
    expect(sizedCdnImageUrl(PREVIEW, 120)).toBe(
      'https://static-cdn.jtvnw.net/previews-ttv/live_user_jynxzi-240x135.jpg',
    );
  });

  it('scales box art', () => {
    // 96px tile at DPR 2 -> 192 wide, 380/285 * 192 = 256
    expect(sizedCdnImageUrl(BOXART, 96)).toBe(
      'https://static-cdn.jtvnw.net/ttv-boxart/509658-192x256.jpg',
    );
  });

  // Upscaling costs bytes AND looks worse — the stored size is the ceiling.
  it('never upscales past what the CDN stored', () => {
    expect(sizedCdnImageUrl(BOXART, 285)).toBe(BOXART);
    expect(sizedCdnImageUrl(BOXART, 1000)).toBe(BOXART);
  });

  it('is idempotent at the same target', () => {
    const once = sizedCdnImageUrl(BOXART, 96)!;
    expect(sizedCdnImageUrl(once, 96)).toBe(once);
  });

  it('survives a query string', () => {
    const withQuery = `${PREVIEW}?x=1`;
    expect(sizedCdnImageUrl(withQuery, 100)).toBe(
      'https://static-cdn.jtvnw.net/previews-ttv/live_user_jynxzi-200x113.jpg?x=1',
    );
  });

  it('leaves URLs without dimensions, and null, alone', () => {
    const plain = 'https://static-cdn.jtvnw.net/previews-ttv/live_user_x.jpg';
    expect(sizedCdnImageUrl(plain, 100)).toBe(plain);
    expect(sizedCdnImageUrl(null, 100)).toBeNull();
  });
});
