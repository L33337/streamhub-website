// Payload budget for the homepage's two biggest client islands (SEO plan F7,
// 2026-09-14). Production's flight carried 362 KB for "Today's lineup" and
// 358 KB for "Clips of the week" (2026-09-13). These fixtures reproduce a
// production-sized pool with production-like field lengths, so a change that
// quietly re-inflates what crosses the boundary fails here instead of in RUM.

import { describe, it, expect } from 'vitest';
import type { PublicStreamSlot } from '@/lib/server/partner-api';
import type { FeedClip } from '@/lib/feed/types';
import { buildLineupIslandData, LINEUP_SSR_COUNT } from '@/lib/home/lineup-filters';
import {
  buildHomeClipsPayload,
  readHomeClip,
  twitchClipUrl,
} from '@/lib/home/clip-payload';

const LINEUP_BUDGET_BYTES = 200_000;
const CLIPS_BUDGET_BYTES = 150_000;

/** Deterministic PRNG (mulberry32), so the fixture never flakes. */
function rng(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function uuid(random: () => number): string {
  const hex = Array.from({ length: 32 }, () => Math.floor(random() * 16).toString(16)).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function words(random: () => number, chars: number): string {
  const vocabulary = [
    'stream', 'weekly', 'ranked', 'grind', 'evening', 'usually', 'starts', 'around',
    'the', 'same', 'time', 'and', 'announced', 'next', 'session', 'chat', 'pattern',
    'Thursday', 'marathon', 'community', 'giveaway', 'tournament', 'practice',
  ];
  let text = '';
  while (text.length < chars) {
    text += `${text ? ' ' : ''}${vocabulary[Math.floor(random() * vocabulary.length)]}`;
  }
  return `${text.slice(0, chars).trimEnd()}.`;
}

const CATEGORIES = [
  'Just Chatting', 'Fortnite', 'VALORANT', 'League of Legends', 'Grand Theft Auto V',
  'Counter-Strike', 'Minecraft', 'Apex Legends', 'Marvel Rivals', 'Call of Duty: Warzone',
];
const LANGUAGES = ['en', 'en', 'en', 'de', 'es', 'pt', 'fr', 'ja', null];
const TIMEZONES = ['America/Los_Angeles', 'Europe/Berlin', 'America/New_York', null];

function lineupFixture(count: number): PublicStreamSlot[] {
  const random = rng(42);
  return Array.from({ length: count }, (_, index) => {
    const login = `streamer${index % 180}name`;
    const youtube = index % 3 === 0;
    return {
      id: `ai_slot_pred_${login}_17888${String(28928607 + index)}_${index % 4}`,
      streamer_id: uuid(random),
      streamer_name: `Streamer ${index % 180} Name`,
      platforms: youtube ? ['youtube'] : ['twitch'],
      title: words(random, 40 + Math.floor(random() * 20)),
      category: CATEGORIES[index % CATEGORIES.length],
      thumbnail_url: null,
      avatar_url: youtube
        ? `https://yt3.ggpht.com/ytc/AIdro_${uuid(random).replace(/-/g, '')}${uuid(random).slice(0, 20)}=s800-c-k-c0x00ffffff-no-rj`
        : `https://static-cdn.jtvnw.net/jtv_user_pictures/${uuid(random)}-profile_image-300x300.png`,
      start_time: new Date(Date.parse('2026-09-14T12:00:00Z') + index * 3 * 60_000)
        .toISOString()
        .replace('.000Z', '+00:00'),
      duration_minutes: 180 + (index % 5) * 30,
      status: 'upcoming',
      is_predicted: true,
      confidence: (['high', 'medium', 'low'] as const)[index % 3],
      slot_kind: index % 17 === 0 ? 'new' : 'regular',
      is_always_on: false,
      twitch_login: youtube ? null : login,
      youtube_channel_id: youtube ? `UC${uuid(random).replace(/-/g, '').slice(0, 22)}` : null,
      streamer_timezone: TIMEZONES[index % TIMEZONES.length],
      streamer_language: LANGUAGES[index % LANGUAGES.length],
      viewer_count: null,
      // 200-630 characters, the production range.
      reasoning: words(random, 200 + Math.floor(random() * 430)),
      copy_language: index % 5 === 0 ? 'de' : 'en',
      generic_reasoning: words(random, 60 + Math.floor(random() * 90)),
    };
  });
}

function clipsFixture(count: number) {
  const random = rng(7);
  const streamers = Array.from({ length: 150 }, (_, index) => ({
    id: uuid(random),
    login: `clipper_${index}_tv`,
    name: `Clipper ${index}`,
    language: LANGUAGES[index % LANGUAGES.length],
  }));
  const adjectives = ['Abstemious', 'Crispy', 'Tangible', 'Sleepy', 'Brave', 'Fancy'];
  const clips: FeedClip[] = Array.from({ length: count }, (_, index) => {
    const streamer = streamers[Math.floor(random() * streamers.length)];
    const slug = `${adjectives[index % 6]}${adjectives[(index + 2) % 6]}Woodpecker${index}-${uuid(random).replace(/-/g, '').slice(0, 16)}`;
    return {
      id: uuid(random),
      streamerId: streamer.id,
      externalClipId: slug,
      title: words(random, 12 + Math.floor(random() * 30)),
      url: twitchClipUrl(streamer.login, slug),
      thumbnailUrl: `https://static-cdn.jtvnw.net/twitch-video-assets/twitch-vap-video-assets-prod-us-west-2/${uuid(random)}/landscape/thumb/thumb-0000000000-480x272.jpg`,
      durationSeconds: 5 + Math.floor(random() * 55),
      viewCount: Math.floor(random() * 250_000),
      category: CATEGORIES[index % CATEGORIES.length],
      clipCreatedAt: '2026-09-10T18:22:41Z',
      creatorName: `creator_${index}`,
    };
  });
  const names: Record<string, string> = {};
  const logins: Record<string, string> = {};
  const languages: Record<string, string> = {};
  for (const streamer of streamers) {
    names[streamer.id] = streamer.name;
    logins[streamer.id] = streamer.login;
    if (streamer.language) languages[streamer.id] = streamer.language;
  }
  return { clips, names, logins, languages };
}

const languageName = (code: string) => code.toUpperCase();

describe('homepage island payload budget', () => {
  it(`keeps "Today's lineup" at 400 slots under ${LINEUP_BUDGET_BYTES / 1000} KB`, () => {
    const slots = lineupFixture(400);
    const { island } = buildLineupIslandData(slots, 'en', languageName);
    expect(island.deferredSlots).toHaveLength(400 - LINEUP_SSR_COUNT);
    expect(JSON.stringify(island).length).toBeLessThanOrEqual(LINEUP_BUDGET_BYTES);
  });

  it(`keeps "Clips of the week" at 500 clips under ${CLIPS_BUDGET_BYTES / 1000} KB`, () => {
    const { clips, names, logins, languages } = clipsFixture(500);
    const payload = buildHomeClipsPayload(clips, names, languages, logins, languageName);
    expect(payload.clips).toHaveLength(500);
    // Every fixture url is rebuildable and every thumbnail packable, as in
    // production (500 of 500 on 2026-09-14).
    const readable = payload.clips.map(readHomeClip);
    expect(readable.every((clip) => clip.url === undefined)).toBe(true);
    expect(readable.every((clip) => clip.thumbId !== undefined)).toBe(true);
    expect(JSON.stringify(payload).length).toBeLessThanOrEqual(CLIPS_BUDGET_BYTES);
  });
});
