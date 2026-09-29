import { describe, expect, it } from 'vitest';
import { parseVideoRequest, VideoRequestError } from '../video-request';

const SUPABASE = 'https://proj.supabase.co';
const CARD = `${SUPABASE}/storage/v1/object/public/social-cards/weekly/2026-09-21/peak-v1.jpg`;
const UPLOAD = `${SUPABASE}/storage/v1/object/upload/sign/social-videos/video/2026-09-21/weekly-v1.mp4?token=abc.def`;

function body(over: Record<string, unknown> = {}) {
  return { scenes: [{ image_url: CARD, seconds: 5 }], outro: true, zoom: true, upload_url: UPLOAD, ...over };
}

function rejects(raw: unknown, pattern: RegExp) {
  try {
    parseVideoRequest(raw, SUPABASE);
  } catch (err) {
    expect(err).toBeInstanceOf(VideoRequestError);
    expect((err as Error).message).toMatch(pattern);
    return;
  }
  throw new Error(`expected a rejection matching ${pattern}`);
}

describe('parseVideoRequest', () => {
  it('accepts the contract and defaults outro and zoom to true', () => {
    expect(parseVideoRequest(body(), SUPABASE)).toEqual({ scenes: [{ image_url: CARD, seconds: 5 }], outro: true, zoom: true, upload_url: UPLOAD });
    const bare = parseVideoRequest({ scenes: [{ image_url: CARD, seconds: 7 }], upload_url: UPLOAD }, SUPABASE);
    expect([bare.outro, bare.zoom]).toEqual([true, true]);
    expect(parseVideoRequest(body({ zoom: false, outro: false }), SUPABASE)).toMatchObject({ zoom: false, outro: false });
  });

  it('rejects malformed bodies', () => {
    rejects(null, /body/);
    rejects([], /body/);
    rejects({}, /scenes/);
    rejects(body({ scenes: [] }), /scenes/);
    rejects(body({ scenes: Array.from({ length: 7 }, () => ({ image_url: CARD, seconds: 5 })) }), /at most/);
    rejects(body({ scenes: ['x'] }), /scenes\[0\]/);
    rejects(body({ scenes: [{ image_url: CARD, seconds: 1 }] }), /seconds/);
    rejects(body({ scenes: [{ image_url: CARD, seconds: 11 }] }), /seconds/);
    rejects(body({ scenes: [{ image_url: CARD, seconds: '5' }] }), /seconds/);
    rejects(body({ zoom: 'yes' }), /zoom/);
    rejects(body({ outro: 1 }), /outro/);
    rejects(body({ upload_url: undefined }), /upload_url/);
  });

  it('pins card URLs to the public card bucket of our project', () => {
    const scene = (image_url: string) => body({ scenes: [{ image_url, seconds: 5 }] });
    rejects(scene('https://evil.example/storage/v1/object/public/social-cards/a.jpg'), /foreign host/);
    rejects(scene('https://proj.supabase.co.evil.example/storage/v1/object/public/social-cards/a.jpg'), /foreign host/);
    rejects(scene('http://proj.supabase.co/storage/v1/object/public/social-cards/a.jpg'), /https/);
    rejects(scene('https://user:pw@proj.supabase.co/storage/v1/object/public/social-cards/a.jpg'), /https/);
    rejects(scene('https://proj.supabase.co:8443/storage/v1/object/public/social-cards/a.jpg'), /https/);
    rejects(scene(`${SUPABASE}/storage/v1/object/public/legal/a.jpg`), /path outside/);
    rejects(scene(`${SUPABASE}/storage/v1/object/public/social-cards/../legal/a.jpg`), /path outside/);
    rejects(scene(`${SUPABASE}/storage/v1/object/public/social-cards/%2e%2e/legal/a.jpg`), /path outside/);
    rejects(scene(`${SUPABASE}/rest/v1/streamers`), /path outside/);
    rejects(scene(`${SUPABASE}/storage/v1/object/public/social-cards/a.png`), /JPEG/);
    rejects(scene(`${CARD}?download=1`), /query/);
    rejects(scene('not a url'), /not a URL/);
    rejects(scene(`${SUPABASE}/storage/v1/object/public/social-cards/${'a'.repeat(2100)}.jpg`), /not a URL/);
  });

  it('pins the upload to a signed .mp4 path in the video bucket', () => {
    rejects(body({ upload_url: `${SUPABASE}/storage/v1/object/upload/sign/social-cards/x.mp4?token=t` }), /path outside/);
    rejects(body({ upload_url: `${SUPABASE}/storage/v1/object/social-videos/x.mp4?token=t` }), /path outside/);
    rejects(body({ upload_url: `https://evil.example/storage/v1/object/upload/sign/social-videos/x.mp4?token=t` }), /foreign host/);
    rejects(body({ upload_url: `${SUPABASE}/storage/v1/object/upload/sign/social-videos/x.jpg?token=t` }), /mp4/);
    rejects(body({ upload_url: `${SUPABASE}/storage/v1/object/upload/sign/social-videos/x.mp4` }), /token/);
  });

  it('fails closed when the server has no usable Supabase URL', () => {
    expect(() => parseVideoRequest(body(), '')).toThrow(VideoRequestError);
  });
});
