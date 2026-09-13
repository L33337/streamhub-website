import { describe, it, expect } from 'vitest';
import { packAvatarUrl, unpackAvatarUrl } from '../avatar-pack';

const YOUTUBE =
  'https://yt3.ggpht.com/hFCbmo1hLADVTDqzx7IPMmM3Lwuvf-MlwWK3sA8ozii7_cuxlg-5xNWM1NDIgyvbiOSVzlARCQ=s800-c-k-c0x00ffffff-no-rj';
const YOUTUBE_YTC =
  'https://yt3.ggpht.com/ytc/AIdro_mlEU_yfnHaKdFyjV3gQNbYYcEWfDqMzAWmVcZqOCFgo0E=s800-c-k-c0x00ffffff-no-rj';
const TWITCH =
  'https://static-cdn.jtvnw.net/jtv_user_pictures/3bf83406-f2a1-49fe-bef2-0f8c6a42c465-profile_image-300x300.png';

describe('packAvatarUrl / unpackAvatarUrl', () => {
  it.each([
    ['a YouTube avatar', YOUTUBE],
    ['a YouTube ytc avatar', YOUTUBE_YTC],
    ['a Twitch avatar', TWITCH],
  ])('packs %s and restores it byte for byte', (_label, url) => {
    const packed = packAvatarUrl(url);
    expect(packed).not.toBe(url);
    expect((packed ?? '').length).toBeLessThan(url.length - 40);
    expect(unpackAvatarUrl(packed)).toBe(url);
  });

  it.each([
    ['another YouTube size', YOUTUBE.replace('=s800', '=s88')],
    ['another Twitch size', TWITCH.replace('300x300', '70x70')],
    ['another host', 'https://cdn.example/avatar.png'],
    ['a bare frame with no middle', 'https://yt3.ggpht.com/=s800-c-k-c0x00ffffff-no-rj'],
  ])('ships %s in full', (_label, url) => {
    expect(packAvatarUrl(url)).toBe(url);
    expect(unpackAvatarUrl(packAvatarUrl(url))).toBe(url);
  });

  it('keeps null as null', () => {
    expect(packAvatarUrl(null)).toBeNull();
    expect(unpackAvatarUrl(null)).toBeNull();
  });

  // A stored value that looks packed would be rebuilt into a URL the database
  // never held; dropping it is the only way to stay strict.
  it('never ships a value the client would misread as packed', () => {
    expect(packAvatarUrl('t:not-a-url')).toBeNull();
    expect(packAvatarUrl('y:')).toBeNull();
  });
});
