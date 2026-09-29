// Weekly social video (Epic M27 Phase 3): turns the already published cards
// (1080×1350) into one vertical MP4 (1080×1920) for TikTok.
//
//   sharp   composes every still: a blurred, darkened cover of the card as
//           the background, the card itself on top (it sits inside TikTok's
//           safe zone: 285 px free above and below)
//   ffmpeg  animates (slow grow of the card), cross-fades the scenes and
//           encodes H.264 + a SILENT AAC track (the sound is picked in the
//           TikTok editor; some players reject a file without audio)
//
// Split on purpose: everything that decides WHAT ffmpeg is asked to do is
// pure (planScenes, buildFfmpegArgs) and unit-tested; the process call is a
// thin shell around it. Server-only.

import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { createElement } from 'react';
import sharp from 'sharp';
import { socialFonts } from './fonts';
import { OutroCard } from './outro-card';
import { SOCIAL_CARD_SIZE } from './types';

export const VIDEO_SIZE = { width: 1080, height: 1920 } as const;
export const VIDEO_FPS = 30;
export const FADE_SECONDS = 0.5;
export const OUTRO_SECONDS = 2.5;
export const MIN_SCENE_SECONDS = 2;
export const MAX_SCENE_SECONDS = 10;
export const MAX_SCENES = 6;
/** TikTok's floor is 3 s; ours is higher because a shorter clip is not a video. */
export const MIN_TOTAL_SECONDS = 4;
export const MAX_TOTAL_SECONDS = 45;
/** The card grows from 93 % to 100 % of the canvas width over its scene. */
export const ZOOM_START = 0.93;

export class SocialVideoError extends Error {
  constructor(
    public code: 'BAD_INPUT' | 'FFMPEG_MISSING' | 'FFMPEG_FAILED' | 'FFMPEG_TIMEOUT',
    message: string,
  ) {
    super(message);
    this.name = 'SocialVideoError';
  }
}

// ============================================
// Planning (pure)
// ============================================

export interface SceneInput {
  seconds: number;
}

export interface PlannedScene {
  index: number;
  seconds: number;
  /** Where the scene starts in the finished video. */
  startsAt: number;
  animated: boolean;
}

export interface VideoPlan {
  scenes: PlannedScene[];
  totalSeconds: number;
  fps: number;
  zoom: boolean;
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/**
 * Scene timing. Every cross-fade overlaps two scenes by FADE_SECONDS, so the
 * video is shorter than the sum of its scenes. `outro` appends the closing
 * frame, which is never animated.
 */
export function planScenes(scenes: SceneInput[], opts: { outro: boolean; zoom: boolean; fps?: number }): VideoPlan {
  if (scenes.length === 0) throw new SocialVideoError('BAD_INPUT', 'no scenes');
  if (scenes.length > MAX_SCENES) throw new SocialVideoError('BAD_INPUT', `at most ${MAX_SCENES} scenes`);
  for (const s of scenes) {
    if (!Number.isFinite(s.seconds) || s.seconds < MIN_SCENE_SECONDS || s.seconds > MAX_SCENE_SECONDS) {
      throw new SocialVideoError('BAD_INPUT', `scene seconds must be ${MIN_SCENE_SECONDS}..${MAX_SCENE_SECONDS}`);
    }
  }
  const all = [...scenes.map((s) => ({ seconds: s.seconds, animated: opts.zoom })), ...(opts.outro ? [{ seconds: OUTRO_SECONDS, animated: false }] : [])];
  let at = 0;
  const planned = all.map((s, index) => {
    const scene = { index, seconds: s.seconds, startsAt: round3(at), animated: s.animated };
    at += s.seconds - FADE_SECONDS;
    return scene;
  });
  const total = round3(at + FADE_SECONDS);
  if (total < MIN_TOTAL_SECONDS || total > MAX_TOTAL_SECONDS) {
    throw new SocialVideoError('BAD_INPUT', `video length ${total} s is outside ${MIN_TOTAL_SECONDS}..${MAX_TOTAL_SECONDS} s`);
  }
  return { scenes: planned, totalSeconds: total, fps: opts.fps ?? VIDEO_FPS, zoom: opts.zoom };
}

export interface SceneFiles {
  /** Animated scene: the background still. Static scene: the finished frame. */
  frame: string;
  /** Animated scene only: the card that grows on top of `frame`. */
  card: string | null;
}

/**
 * The ffmpeg argument list. Inputs are single stills held by the loop filter; an animated scene scales
 * its card per frame and overlays it centred; scenes are chained with xfade;
 * the last input is the silent audio source.
 */
export function buildFfmpegArgs(plan: VideoPlan, files: SceneFiles[], outPath: string): string[] {
  if (files.length !== plan.scenes.length) throw new SocialVideoError('BAD_INPUT', 'scene files do not match the plan');
  const args: string[] = ['-hide_banner', '-loglevel', 'error', '-y'];
  // One decoded frame per still: converted to yuv420p ONCE, then repeated by
  // the loop filter. Converting after the loop would run swscale on every one
  // of the ~700 frames.
  const still = (file: string) => ['-framerate', String(plan.fps), '-i', file];
  const hold = (seconds: number) => `format=yuv420p,setsar=1,loop=loop=${Math.round(seconds * plan.fps) - 1}:size=1:start=0`;

  const filters: string[] = [];
  let input = 0;
  plan.scenes.forEach((scene, i) => {
    const f = files[i];
    const tail = `fps=${plan.fps},settb=AVTB[s${i}]`;
    args.push(...still(f.frame));
    const frameIn = input++;
    if (scene.animated && f.card) {
      args.push(...still(f.card));
      const cardIn = input++;
      const w0 = Math.round(VIDEO_SIZE.width * ZOOM_START);
      const grow = VIDEO_SIZE.width - w0;
      // Even sizes only (yuv420p); the last frame lands exactly on full width.
      filters.push(
        `[${cardIn}:v]${hold(scene.seconds)},scale=w='2*trunc((${w0}+${grow}*min(t/${round3(scene.seconds - FADE_SECONDS)},1))/2)':h=-2:eval=frame:flags=bicubic[c${i}]`,
        `[${frameIn}:v]${hold(scene.seconds)}[b${i}]`,
        `[b${i}][c${i}]overlay=x='(W-w)/2':y='(H-h)/2':eval=frame:format=yuv420,${tail}`,
      );
    } else {
      filters.push(`[${frameIn}:v]${hold(scene.seconds)},${tail}`);
    }
  });

  let last = 's0';
  for (let i = 1; i < plan.scenes.length; i++) {
    const out = i === plan.scenes.length - 1 ? 'v' : `x${i}`;
    filters.push(`[${last}][s${i}]xfade=transition=fade:duration=${FADE_SECONDS}:offset=${plan.scenes[i].startsAt}[${out}]`);
    last = out;
  }
  if (plan.scenes.length === 1) filters.push('[s0]null[v]');

  args.push('-f', 'lavfi', '-t', String(plan.totalSeconds), '-i', 'anullsrc=r=48000:cl=stereo');
  const audioIn = input;

  args.push(
    '-filter_complex', filters.join(';'),
    '-map', '[v]',
    '-map', `${audioIn}:a`,
    '-t', String(plan.totalSeconds),
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-crf', '21',
    '-maxrate', '6M',
    '-bufsize', '12M',
    '-pix_fmt', 'yuv420p',
    '-r', String(plan.fps),
    '-g', String(plan.fps * 2),
    '-c:a', 'aac',
    '-b:a', '64k',
    '-movflags', '+faststart',
    '-f', 'mp4',
    outPath,
  );
  return args;
}

// ============================================
// Stills (sharp + Satori)
// ============================================

export interface ComposedScene {
  /** 1080×1920: blurred cover only (animated) or cover + card (static). */
  frame: Buffer;
  /** 1080×1350 card, only for an animated scene. */
  card: Buffer | null;
}

/** The card must be the contract size; anything else is a caller bug, not something to stretch. */
export async function assertCard(card: Buffer): Promise<void> {
  let meta;
  try {
    meta = await sharp(card).metadata();
  } catch {
    throw new SocialVideoError('BAD_INPUT', 'scene image is not a readable image');
  }
  if (meta.width !== SOCIAL_CARD_SIZE.width || meta.height !== SOCIAL_CARD_SIZE.height) {
    throw new SocialVideoError('BAD_INPUT', `scene image is ${meta.width}×${meta.height}, expected ${SOCIAL_CARD_SIZE.width}×${SOCIAL_CARD_SIZE.height}`);
  }
}

export async function composeScene(card: Buffer, animated: boolean): Promise<ComposedScene> {
  await assertCard(card);
  const cover = await sharp(card)
    .resize(VIDEO_SIZE.width, VIDEO_SIZE.height, { fit: 'cover' })
    .blur(28)
    .modulate({ brightness: 0.55 })
    .png({ compressionLevel: 3 })
    .toBuffer();
  if (animated) {
    const cardPng = await sharp(card).png({ compressionLevel: 3 }).toBuffer();
    return { frame: cover, card: cardPng };
  }
  const top = Math.round((VIDEO_SIZE.height - SOCIAL_CARD_SIZE.height) / 2);
  const frame = await sharp(cover)
    .composite([{ input: card, top, left: 0 }])
    .png({ compressionLevel: 3 })
    .toBuffer();
  return { frame, card: null };
}

export async function renderOutro(): Promise<Buffer> {
  const fonts = await socialFonts();
  const png = new ImageResponse(createElement(OutroCard), {
    ...VIDEO_SIZE,
    fonts: fonts.map((f) => ({ name: f.name, data: f.data, weight: f.weight, style: f.style })),
  });
  return Buffer.from(await png.arrayBuffer());
}

// ============================================
// Render
// ============================================

/** ffmpeg-static ships the binary next to its package.json; the route is traced to include it. */
export function ffmpegPath(): string {
  return process.env.FFMPEG_PATH || join(process.cwd(), 'node_modules', 'ffmpeg-static', process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg');
}

export interface RenderVideoInput {
  scenes: Array<{ image: Buffer; seconds: number }>;
  outro: boolean;
  zoom: boolean;
}

export interface RenderVideoOptions {
  timeoutMs?: number;
  /** Parent of the scratch directory (default: the OS temp dir). */
  tmpRoot?: string;
  /** Tests inject a stub; production runs the real binary. */
  run?: (file: string, args: string[], timeoutMs: number) => Promise<void>;
}

export interface RenderedVideo {
  bytes: Buffer;
  seconds: number;
  fps: number;
  width: number;
  height: number;
  zoom: boolean;
  scenes: number;
  renderMs: number;
}

export function runFfmpeg(file: string, args: string[], timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile(file, args, { timeout: timeoutMs, killSignal: 'SIGKILL', maxBuffer: 4 * 1024 * 1024, windowsHide: true }, (err, _stdout, stderr) => {
      if (!err) return resolve();
      const e = err as NodeJS.ErrnoException & { killed?: boolean; signal?: string };
      if (e.code === 'ENOENT') return reject(new SocialVideoError('FFMPEG_MISSING', `ffmpeg binary not found at ${file}`));
      if (e.killed || e.signal === 'SIGKILL') return reject(new SocialVideoError('FFMPEG_TIMEOUT', `ffmpeg exceeded ${timeoutMs} ms`));
      reject(new SocialVideoError('FFMPEG_FAILED', String(stderr || err.message).trim().slice(-600)));
    });
  });
}

export async function renderSocialVideo(input: RenderVideoInput, opts: RenderVideoOptions = {}): Promise<RenderedVideo> {
  const started = Date.now();
  const plan = planScenes(input.scenes, { outro: input.outro, zoom: input.zoom });
  const dir = await mkdtemp(join(opts.tmpRoot ?? tmpdir(), 'social-video-'));
  try {
    const composed = await Promise.all(input.scenes.map((s) => composeScene(s.image, input.zoom)));
    if (input.outro) composed.push({ frame: await renderOutro(), card: null });

    const files: SceneFiles[] = [];
    for (let i = 0; i < composed.length; i++) {
      const frame = join(dir, `frame-${i}.png`);
      await writeFile(frame, composed[i].frame);
      let card: string | null = null;
      if (composed[i].card) {
        card = join(dir, `card-${i}.png`);
        await writeFile(card, composed[i].card!);
      }
      files.push({ frame, card });
    }

    const out = join(dir, 'out.mp4');
    await (opts.run ?? runFfmpeg)(ffmpegPath(), buildFfmpegArgs(plan, files, out), opts.timeoutMs ?? 50_000);
    const bytes = await readFile(out);
    if (bytes.length < 1024) throw new SocialVideoError('FFMPEG_FAILED', `ffmpeg wrote ${bytes.length} bytes`);
    return {
      bytes,
      seconds: plan.totalSeconds,
      fps: plan.fps,
      width: VIDEO_SIZE.width,
      height: VIDEO_SIZE.height,
      zoom: plan.zoom,
      scenes: plan.scenes.length,
      renderMs: Date.now() - started,
    };
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
}
