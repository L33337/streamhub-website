import { execFile } from 'node:child_process';
import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import {
  runFfmpeg,
  buildFfmpegArgs,
  composeScene,
  FADE_SECONDS,
  ffmpegPath,
  OUTRO_SECONDS,
  planScenes,
  renderOutro,
  renderSocialVideo,
  SocialVideoError,
  ZOOM_START,
} from '../video';

// The planning half is pure. The render half runs the REAL ffmpeg binary
// (ffmpeg-static) on generated cards, so a filter graph that ffmpeg rejects
// fails here and not in production.
//
// Review a video by hand:
//   SOCIAL_VIDEO_CARDS=a.jpg,b.jpg SOCIAL_VIDEO_OUT=tmp/video.mp4 npx vitest run lib/og/social/__tests__/video.test.ts

async function card(color: string, label: string): Promise<Buffer> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350"><rect width="1080" height="1350" fill="${color}"/><rect x="88" y="96" width="904" height="1166" fill="none" stroke="#fff" stroke-width="6"/><text x="540" y="700" font-size="120" fill="#fff" text-anchor="middle" font-family="sans-serif">${label}</text></svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 90 }).toBuffer();
}

/** `ffmpeg -i file` prints the container facts to stderr and exits 1 (no output file). */
function probe(file: string): Promise<string> {
  return new Promise((resolve) => {
    execFile(ffmpegPath(), ['-hide_banner', '-i', file], { windowsHide: true }, (_err, _stdout, stderr) => resolve(String(stderr)));
  });
}

/** A scratch root of this test alone: other test files render in parallel. */
async function scratchRoot(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'social-video-test-'));
}

describe('planScenes', () => {
  it('overlaps every cross-fade, so the video is shorter than the sum of its scenes', () => {
    const plan = planScenes([{ seconds: 7 }, { seconds: 5 }, { seconds: 5 }, { seconds: 5 }], { outro: true, zoom: true });
    expect(plan.scenes.map((s) => s.startsAt)).toEqual([0, 6.5, 11, 15.5, 20]);
    expect(plan.scenes.map((s) => s.seconds)).toEqual([7, 5, 5, 5, OUTRO_SECONDS]);
    expect(plan.totalSeconds).toBe(7 + 5 + 5 + 5 + OUTRO_SECONDS - 4 * FADE_SECONDS);
    expect(plan.totalSeconds).toBe(22.5);
  });

  it('never animates the outro, and animates nothing without zoom', () => {
    expect(planScenes([{ seconds: 5 }, { seconds: 5 }], { outro: true, zoom: true }).scenes.map((s) => s.animated)).toEqual([true, true, false]);
    expect(planScenes([{ seconds: 5 }, { seconds: 5 }], { outro: true, zoom: false }).scenes.map((s) => s.animated)).toEqual([false, false, false]);
  });

  it('accepts the shortest real case: two recap cards and the outro', () => {
    const plan = planScenes([{ seconds: 5 }, { seconds: 5 }], { outro: true, zoom: true });
    expect(plan.totalSeconds).toBe(11.5);
  });

  it('rejects empty, oversized and out-of-range input', () => {
    const bad = (fn: () => unknown) => {
      try {
        fn();
      } catch (err) {
        expect(err).toBeInstanceOf(SocialVideoError);
        expect((err as SocialVideoError).code).toBe('BAD_INPUT');
        return;
      }
      throw new Error('expected a SocialVideoError');
    };
    bad(() => planScenes([], { outro: true, zoom: true }));
    bad(() => planScenes(Array.from({ length: 7 }, () => ({ seconds: 5 })), { outro: true, zoom: true }));
    bad(() => planScenes([{ seconds: 1 }], { outro: true, zoom: true }));
    bad(() => planScenes([{ seconds: 11 }], { outro: true, zoom: true }));
    bad(() => planScenes([{ seconds: Number.NaN }], { outro: true, zoom: true }));
    // one 2 s scene without the outro is below the minimum length
    bad(() => planScenes([{ seconds: 2 }], { outro: false, zoom: true }));
    // six 10 s scenes are above the maximum length
    bad(() => planScenes(Array.from({ length: 6 }, () => ({ seconds: 10 })), { outro: true, zoom: true }));
  });
});

describe('buildFfmpegArgs', () => {
  const plan = planScenes([{ seconds: 7 }, { seconds: 5 }], { outro: true, zoom: true });
  const files = [
    { frame: 'f0.png', card: 'c0.png' },
    { frame: 'f1.png', card: 'c1.png' },
    { frame: 'f2.png', card: null },
  ];
  const args = buildFfmpegArgs(plan, files, 'out.mp4');
  const graph = args[args.indexOf('-filter_complex') + 1];

  it('feeds every still once and the silent audio source last', () => {
    const inputs = args.filter((_, i) => args[i - 1] === '-i');
    expect(inputs).toEqual(['f0.png', 'c0.png', 'f1.png', 'c1.png', 'f2.png', 'anullsrc=r=48000:cl=stereo']);
    expect(args.slice(args.indexOf('-map'), args.indexOf('-map') + 4)).toEqual(['-map', '[v]', '-map', '5:a']);
    // -loop 1 on an input would decode the PNG again for every frame
    expect(args).not.toContain('-loop');
  });

  it('grows the card from the start width to exactly the full width', () => {
    const w0 = Math.round(1080 * ZOOM_START);
    expect(graph).toContain(`[1:v]format=yuv420p,setsar=1,loop=loop=209:size=1:start=0,scale=w='2*trunc((${w0}+${1080 - w0}*min(t/6.5,1))/2)':h=-2:eval=frame`);
    expect(graph).toContain(`[3:v]format=yuv420p,setsar=1,loop=loop=149:size=1:start=0,scale=w='2*trunc((${w0}+${1080 - w0}*min(t/4.5,1))/2)':h=-2:eval=frame`);
    expect(graph).toContain('[0:v]format=yuv420p,setsar=1,loop=loop=209:size=1:start=0[b0]');
    expect(graph).toContain('[4:v]format=yuv420p,setsar=1,loop=loop=74:size=1:start=0,fps=30,settb=AVTB[s2]');
  });

  it('chains the scenes with cross-fades at the planned offsets', () => {
    expect(graph).toContain('[s0][s1]xfade=transition=fade:duration=0.5:offset=6.5[x1]');
    expect(graph).toContain('[x1][s2]xfade=transition=fade:duration=0.5:offset=11[v]');
  });

  it('encodes what TikTok asks for: H.264 yuv420p, 30 fps, AAC, faststart', () => {
    const value = (flag: string) => args[args.indexOf(flag) + 1];
    expect(value('-c:v')).toBe('libx264');
    expect(value('-pix_fmt')).toBe('yuv420p');
    expect(value('-r')).toBe('30');
    expect(value('-c:a')).toBe('aac');
    expect(value('-movflags')).toBe('+faststart');
    expect(value('-t')).toBeDefined();
    expect(args[args.length - 1]).toBe('out.mp4');
  });

  it('handles a single scene without a cross-fade', () => {
    const one = planScenes([{ seconds: 6 }], { outro: false, zoom: false });
    const g = buildFfmpegArgs(one, [{ frame: 'f.png', card: null }], 'o.mp4');
    expect(g[g.indexOf('-filter_complex') + 1]).toBe('[0:v]format=yuv420p,setsar=1,loop=loop=179:size=1:start=0,fps=30,settb=AVTB[s0];[s0]null[v]');
  });

  it('refuses a file list that does not match the plan', () => {
    expect(() => buildFfmpegArgs(plan, files.slice(0, 2), 'out.mp4')).toThrow(SocialVideoError);
  });
});

describe('stills', () => {
  it('composes a static scene as one 1080×1920 frame with the card centred', async () => {
    const scene = await composeScene(await card('#102040', 'A'), false);
    expect(scene.card).toBeNull();
    const meta = await sharp(scene.frame).metadata();
    expect([meta.width, meta.height]).toEqual([1080, 1920]);
    // The white frame of the card starts 96 px below the card's top edge (285 px).
    const { data, info } = await sharp(scene.frame).raw().toBuffer({ resolveWithObject: true });
    const px = (x: number, y: number) => Array.from(data.subarray((y * info.width + x) * info.channels, (y * info.width + x) * info.channels + 3));
    expect(px(540, 285 + 96 + 2).every((c) => c > 200)).toBe(true); // card border, sharp
    expect(px(540, 100).every((c) => c < 120)).toBe(true); // darkened cover above the card
  });

  it('keeps background and card apart for an animated scene', async () => {
    const scene = await composeScene(await card('#102040', 'A'), true);
    expect((await sharp(scene.frame).metadata()).height).toBe(1920);
    expect((await sharp(scene.card!).metadata()).height).toBe(1350);
  });

  it('rejects an image that is not a 1080×1350 card', async () => {
    const wrong = await sharp({ create: { width: 1080, height: 1080, channels: 3, background: '#000' } }).jpeg().toBuffer();
    await expect(composeScene(wrong, false)).rejects.toMatchObject({ code: 'BAD_INPUT' });
    await expect(composeScene(Buffer.from('not an image'), false)).rejects.toMatchObject({ code: 'BAD_INPUT' });
  });

  it('renders the outro at 1080×1920', async () => {
    const meta = await sharp(await renderOutro()).metadata();
    expect([meta.width, meta.height, meta.format]).toEqual([1080, 1920, 'png']);
  }, 60_000);
});

describe('renderSocialVideo (real ffmpeg)', () => {
  it('writes a playable MP4 with the planned length and cleans up after itself', async () => {
    const root = await scratchRoot();
    const video = await renderSocialVideo(
      { scenes: [{ image: await card('#203060', 'ONE'), seconds: 2 }, { image: await card('#602030', 'TWO'), seconds: 2 }], outro: true, zoom: true },
      { timeoutMs: 120_000, tmpRoot: root },
    );
    expect(video.seconds).toBe(2 + 2 + OUTRO_SECONDS - 2 * FADE_SECONDS);
    expect(video.scenes).toBe(3);
    expect(video.bytes.subarray(4, 8).toString('latin1')).toBe('ftyp');
    expect(video.bytes.length).toBeGreaterThan(20_000);
    expect(video.bytes.length).toBeLessThan(8_000_000);

    const dir = await mkdtemp(join(tmpdir(), 'probe-'));
    try {
      const file = join(dir, 'v.mp4');
      await writeFile(file, video.bytes);
      const info = await probe(file);
      expect(info).toMatch(/Duration: 00:00:05\.[0-9]{2}/);
      expect(info).toMatch(/Video: h264[^\n]*yuv420p[^\n]*1080x1920/);
      expect(info).toMatch(/30 fps/);
      expect(info).toMatch(/Audio: aac[^\n]*48000 Hz[^\n]*stereo/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
    expect(await readdir(root)).toEqual([]);
    await rm(root, { recursive: true, force: true });
  }, 180_000);

  it('renders without zoom too (the fallback when the render budget is tight)', async () => {
    const video = await renderSocialVideo({ scenes: [{ image: await card('#203060', 'ONE'), seconds: 3 }], outro: true, zoom: false }, { timeoutMs: 120_000 });
    expect(video.zoom).toBe(false);
    expect(video.seconds).toBe(5);
    expect(video.bytes.subarray(4, 8).toString('latin1')).toBe('ftyp');
  }, 180_000);

  it('reports a timeout and a failing ffmpeg as typed errors, and still cleans up', async () => {
    const root = await scratchRoot();
    const scenes = [{ image: await card('#203060', 'ONE'), seconds: 5 }];
    await expect(
      renderSocialVideo({ scenes, outro: false, zoom: false }, { tmpRoot: root, run: () => Promise.reject(new SocialVideoError('FFMPEG_TIMEOUT', 'ffmpeg exceeded 1 ms')) }),
    ).rejects.toMatchObject({ code: 'FFMPEG_TIMEOUT' });
    await expect(
      renderSocialVideo({ scenes, outro: false, zoom: false }, { tmpRoot: root, run: () => Promise.reject(new SocialVideoError('FFMPEG_FAILED', 'boom')) }),
    ).rejects.toMatchObject({ code: 'FFMPEG_FAILED' });
    // ffmpeg "succeeded" but wrote nothing
    await expect(renderSocialVideo({ scenes, outro: false, zoom: false }, { tmpRoot: root, run: () => Promise.resolve() })).rejects.toBeTruthy();
    expect(await readdir(root)).toEqual([]);
    await rm(root, { recursive: true, force: true });
  }, 60_000);

  const cards = process.env.SOCIAL_VIDEO_CARDS;
  const out = process.env.SOCIAL_VIDEO_OUT;
  it.runIf(Boolean(cards && out))('review render from real cards (SOCIAL_VIDEO_CARDS → SOCIAL_VIDEO_OUT)', async () => {
    const files = cards!.split(',').map((s) => s.trim()).filter(Boolean);
    const scenes = await Promise.all(files.map(async (f, i) => ({ image: await readFile(f), seconds: i === 0 && files.length > 3 ? 7 : 5 })));
    // SOCIAL_VIDEO_THREADS=1 approximates a single-vCPU serverless function.
    const threads = process.env.SOCIAL_VIDEO_THREADS;
    const run = threads
      ? (file: string, args: string[], t: number) => runFfmpeg(file, ['-filter_complex_threads', threads, ...args.slice(0, -1), '-threads', threads, args[args.length - 1]], t)
      : undefined;
    const video = await renderSocialVideo({ scenes, outro: true, zoom: process.env.SOCIAL_VIDEO_ZOOM !== 'false' }, { timeoutMs: 300_000, run });
    await writeFile(out!, video.bytes);
    await writeFile(`${out}.json`, JSON.stringify({ seconds: video.seconds, bytes: video.bytes.length, render_ms: video.renderMs, zoom: video.zoom, threads: threads ?? 'auto' }));
    expect(video.bytes.length).toBeGreaterThan(100_000);
  }, 360_000);
});
