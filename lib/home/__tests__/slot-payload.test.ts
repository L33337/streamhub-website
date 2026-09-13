import { describe, it, expect } from 'vitest';
import type { PublicStreamSlot } from '@/lib/server/partner-api';
import { pickReasoning } from '@/lib/slot-copy';
import {
  hydrateLineupCardSlot,
  LINEUP_CARD_DEFAULTS,
  LINEUP_CARD_WIRE_KEYS,
  LINEUP_TEASER_MAX_CHARS,
  readLineupCardSlot,
  toLineupCardSlot,
  toLiveCardSlot,
  truncateTeaser,
} from '../slot-payload';
import { liveWatchUrl } from '../live-rail';

/** The readable (decoded, still pruned) form of what the lineup island receives. */
function prune(full: PublicStreamSlot, viewer: string) {
  return readLineupCardSlot(toLineupCardSlot(full, viewer));
}

/** Prefix semantics: the shipped teaser is the full text or a cut of it plus "…". */
function expectTeaserOf(teaser: string, full: string) {
  expect(teaser.length).toBeLessThanOrEqual(LINEUP_TEASER_MAX_CHARS);
  if (full.length <= LINEUP_TEASER_MAX_CHARS) {
    expect(teaser).toBe(full);
    return;
  }
  expect(teaser.endsWith('…')).toBe(true);
  expect(full.startsWith(teaser.slice(0, -1))).toBe(true);
}

const LONG_REASONING =
  'She has streamed on nearly every Thursday evening for the past four weeks, ' +
  'always starting within a few minutes of the same time, and in her last ' +
  'broadcast she told chat that the next session would continue the ranked ' +
  'grind before a longer break over the holidays, so expect another late session.';

function slot(overrides: Partial<PublicStreamSlot> = {}): PublicStreamSlot {
  return {
    id: 'slot-1',
    streamer_id: 'streamer-1',
    streamer_name: 'Streamer One',
    platforms: ['twitch'],
    title: 'A stream',
    category: 'Just Chatting',
    thumbnail_url: null,
    avatar_url: 'https://cdn.example/avatar.png',
    start_time: '2026-08-01T20:00:00Z',
    duration_minutes: 240,
    status: 'upcoming',
    is_predicted: true,
    confidence: 'high',
    slot_kind: 'regular',
    is_always_on: false,
    twitch_login: 'streamerone',
    youtube_channel_id: 'UCabc',
    streamer_timezone: 'Europe/Berlin',
    streamer_language: 'de',
    viewer_count: null,
    reasoning: 'Sie streamt fast jeden Donnerstagabend zur selben Zeit.',
    copy_language: 'de',
    generic_reasoning: 'Regular weekday slot with a consistent four-week pattern.',
    ...overrides,
  };
}

describe('toLineupCardSlot', () => {
  // THE property this whole optimization rests on: the card re-runs
  // pickReasoning on the pruned payload, so the pruning may not change what it
  // resolves to — text, generic-label and `lang` attribute alike.
  it.each([
    ['copy in the viewer language', { copy_language: 'de' }, 'de'],
    ['copy in English', { copy_language: 'en' }, 'de'],
    ['copy in a third language (falls back to generic)', { copy_language: 'ja' }, 'de'],
    ['copy in a third language, no generic', { copy_language: 'ja', generic_reasoning: undefined }, 'de'],
    ['unknown copy language', { copy_language: null }, 'en'],
    ['no reasoning at all', { reasoning: undefined }, 'en'],
    ['neither text', { reasoning: undefined, generic_reasoning: undefined }, 'fr'],
    ['blank reasoning', { reasoning: '   ' }, 'en'],
    ['long copy in the viewer language', { reasoning: LONG_REASONING, copy_language: 'en' }, 'en'],
    [
      'long generic fallback',
      { copy_language: 'ja', generic_reasoning: LONG_REASONING },
      'de',
    ],
  ])('round-trips pickReasoning for %s', (_label, overrides, viewer) => {
    const full = slot(overrides as Partial<PublicStreamSlot>);
    const expected = pickReasoning(full, viewer);
    const actual = pickReasoning(prune(full, viewer), viewer);
    if (expected === null) {
      expect(actual).toBeNull();
      return;
    }
    // Label and `lang` attribute survive exactly; the text is the teaser.
    expect(actual).not.toBeNull();
    expect(actual?.isGeneric).toBe(expected.isGeneric);
    expect(actual?.lang).toBe(expected.lang);
    expectTeaserOf(actual?.text ?? '', expected.text);
  });

  it('cuts long reasoning to the teaser length at a word boundary', () => {
    const pruned = prune(slot({ reasoning: LONG_REASONING, copy_language: 'en' }), 'en');
    expect(LONG_REASONING.length).toBeGreaterThan(LINEUP_TEASER_MAX_CHARS);
    expectTeaserOf(pruned.reasoning ?? '', LONG_REASONING);
    // Ends on a whole word, not mid-word.
    const withoutEllipsis = (pruned.reasoning ?? '').slice(0, -1);
    expect(LONG_REASONING[withoutEllipsis.length]).toMatch(/\s/);
  });

  it('ships only ONE copy text — never both', () => {
    const pruned = prune(slot({ copy_language: 'ja' }), 'de');
    // Viewer reads neither ja nor... well, ja isn't de or en, so the English
    // generic wins and the (unreadable) real copy must not travel with it.
    expect(pruned.generic_reasoning).toBeDefined();
    expect(pruned.reasoning).toBeUndefined();

    const own = prune(slot({ copy_language: 'de' }), 'de');
    expect(own.reasoning).toBeDefined();
    expect(own.generic_reasoning).toBeUndefined();
  });

  it('drops the fields no card reads', () => {
    const pruned = prune(slot(), 'de') as Record<string, unknown>;
    for (const key of ['streamer_id', 'twitch_login', 'youtube_channel_id']) {
      expect(pruned, `${key} must not be shipped`).not.toHaveProperty(key);
    }
  });

  it('ships the NORMALIZED broadcaster language for the island’s filter', () => {
    expect(prune(slot({ streamer_language: 'pt-BR' }), 'en').streamer_language).toBe(
      'pt',
    );
    expect(prune(slot({ streamer_language: null }), 'en')).not.toHaveProperty(
      'streamer_language',
    );
  });

  it('omits default-valued fields and hydrate restores them', () => {
    const pruned = prune(slot(), 'en');
    for (const key of ['status', 'is_predicted', 'is_always_on', 'thumbnail_url']) {
      expect(pruned, `${key} is at its default`).not.toHaveProperty(key);
    }
    const hydrated = hydrateLineupCardSlot(toLineupCardSlot(slot(), 'en'));
    expect(hydrated.status).toBe(LINEUP_CARD_DEFAULTS.status);
    expect(hydrated.is_predicted).toBe(true);
    expect(hydrated.is_always_on).toBe(false);
    expect(hydrated.thumbnail_url).toBeNull();
  });

  it.each([
    [{ status: 'live' as const }],
    [{ status: 'offline' as const }],
    [{ is_predicted: false }],
    [{ is_always_on: true }],
    [{ thumbnail_url: 'https://static-cdn.jtvnw.net/previews-ttv/live_user_x-440x248.jpg' }],
    [{ status: 'live' as const, is_predicted: false, is_always_on: true }],
  ])('round-trips non-default values %j through hydrate', (overrides) => {
    const full = slot(overrides);
    const hydrated = hydrateLineupCardSlot(toLineupCardSlot(full, 'en'));
    expect(hydrated.status).toBe(full.status);
    expect(hydrated.is_predicted).toBe(full.is_predicted);
    expect(hydrated.is_always_on).toBe(full.is_always_on);
    expect(hydrated.thumbnail_url).toBe(full.thumbnail_url);
  });

  it.each([
    'https://yt3.ggpht.com/ytc/AIdro_k2R4gOzj0DsreLUb4kJ-3QT_RJonCM46s3u0VdSDzVQ=s800-c-k-c0x00ffffff-no-rj',
    'https://static-cdn.jtvnw.net/jtv_user_pictures/3bf83406-f2a1-49fe-bef2-0f8c6a42c465-profile_image-300x300.png',
    'https://cdn.example/avatar.png',
    null,
  ])('packs the avatar %s and hydrates it back byte for byte', (avatar) => {
    const wire = toLineupCardSlot(slot({ avatar_url: avatar }), 'en');
    expect(hydrateLineupCardSlot(JSON.parse(JSON.stringify(wire))).avatar_url).toBe(avatar);
  });

  it('travels under short, unique wire keys and survives JSON', () => {
    const shortKeys = Object.values(LINEUP_CARD_WIRE_KEYS);
    expect(new Set(shortKeys).size).toBe(shortKeys.length);

    const wire = toLineupCardSlot(slot({ slot_kind: 'new', viewer_count: 3 }), 'de');
    expect(wire).not.toHaveProperty('streamer_name');
    expect(hydrateLineupCardSlot(JSON.parse(JSON.stringify(wire)))).toEqual(
      hydrateLineupCardSlot(wire),
    );
  });

  it('hydrates back to every card field of the DTO', () => {
    const full = slot({
      reasoning: 'Short.',
      copy_language: 'en',
      slot_kind: 'new',
      viewer_count: 12,
    });
    const hydrated = hydrateLineupCardSlot(toLineupCardSlot(full, 'en'));
    for (const key of [
      'id',
      'streamer_name',
      'title',
      'category',
      'platforms',
      'thumbnail_url',
      'avatar_url',
      'start_time',
      'duration_minutes',
      'status',
      'is_predicted',
      'confidence',
      'is_always_on',
      'streamer_timezone',
      'slot_kind',
      'viewer_count',
      'reasoning',
    ] as const) {
      expect(hydrated[key], key).toEqual(full[key]);
    }
  });

  it('omits slot_kind when it carries no information', () => {
    // The DTO documents an absent slot_kind as 'regular', so shipping the word
    // is 25 bytes per card for nothing.
    expect(prune(slot({ slot_kind: 'regular' }), 'en')).not.toHaveProperty(
      'slot_kind',
    );
    expect(prune(slot({ slot_kind: undefined }), 'en')).not.toHaveProperty(
      'slot_kind',
    );
    expect(prune(slot({ slot_kind: 'cancelled' }), 'en').slot_kind).toBe(
      'cancelled',
    );
    expect(prune(slot({ slot_kind: 'new' }), 'en').slot_kind).toBe('new');
  });

  it('keeps every field the status line is derived from', () => {
    const pruned = hydrateLineupCardSlot(
      toLineupCardSlot(slot({ streamer_timezone: 'Asia/Tokyo', is_always_on: true }), 'en'),
    );
    expect(pruned.start_time).toBe('2026-08-01T20:00:00Z');
    expect(pruned.duration_minutes).toBe(240);
    expect(pruned.status).toBe('upcoming');
    expect(pruned.is_always_on).toBe(true);
    expect(pruned.streamer_timezone).toBe('Asia/Tokyo');
    expect(pruned.is_predicted).toBe(true);
  });

  it('omits viewer_count unless it is a real number', () => {
    expect(prune(slot({ viewer_count: null }), 'en')).not.toHaveProperty(
      'viewer_count',
    );
    expect(prune(slot({ viewer_count: 0 }), 'en').viewer_count).toBe(0);
  });
});

describe('truncateTeaser', () => {
  it('leaves short text untouched', () => {
    expect(truncateTeaser('Short and sweet.')).toBe('Short and sweet.');
    const exact = 'x'.repeat(LINEUP_TEASER_MAX_CHARS);
    expect(truncateTeaser(exact)).toBe(exact);
  });

  it('never exceeds the limit and keeps prefix semantics', () => {
    for (const length of [221, 300, 634]) {
      const text = Array.from({ length }, (_, i) => (i % 7 === 6 ? ' ' : 'a')).join('');
      expectTeaserOf(truncateTeaser(text), text);
    }
  });

  it('cuts text without spaces hard, and never inside a surrogate pair', () => {
    const cjk = '毎週木曜日の夜に配信しています'.repeat(20);
    const cut = truncateTeaser(cjk);
    expectTeaserOf(cut, cjk);

    const emoji = `${'a'.repeat(LINEUP_TEASER_MAX_CHARS - 2)}😀😀😀`;
    const emojiCut = truncateTeaser(emoji);
    expectTeaserOf(emojiCut, emoji);
    const last = emojiCut.charCodeAt(emojiCut.length - 2);
    expect(last >= 0xd800 && last <= 0xdbff).toBe(false);
  });

  it('drops dangling punctuation before the ellipsis', () => {
    // The last boundary inside the window sits right after "comma,".
    const text = `${'word '.repeat(42)}comma, ${'tail '.repeat(20)}`;
    expect(truncateTeaser(text)).toMatch(/comma…$/);
  });
});

describe('toLiveCardSlot', () => {
  it('keeps the channel id of the platform the slot is live on', () => {
    const twitchOnly = toLiveCardSlot(
      slot({ platforms: ['twitch'], status: 'live' }),
    );
    expect(twitchOnly.twitch_login).toBe('streamerone');
    expect(twitchOnly).not.toHaveProperty('youtube_channel_id');

    const ytOnly = toLiveCardSlot(
      slot({ platforms: ['youtube'], status: 'live', twitch_login: 'ghost' }),
    );
    expect(ytOnly.youtube_channel_id).toBe('UCabc');
    expect(ytOnly).not.toHaveProperty('twitch_login');
  });

  // Pruning must not change where a card links — that is the one thing this
  // rail does differently from every other card on the site.
  it.each([
    [['twitch'] as const, 'https://twitch.tv/streamerone'],
    [['youtube'] as const, 'https://youtube.com/channel/UCabc/live'],
    [['twitch', 'youtube'] as const, 'https://twitch.tv/streamerone'],
  ])('preserves the watch URL for %s', (platforms, expected) => {
    const full = slot({ platforms: [...platforms], status: 'live' });
    expect(liveWatchUrl(toLiveCardSlot(full))).toBe(expected);
    expect(liveWatchUrl(toLiveCardSlot(full))).toBe(liveWatchUrl(full));
  });

  it('falls back to the internal link when no channel id survives', () => {
    const noIds = toLiveCardSlot(
      slot({ platforms: ['twitch'], twitch_login: null, status: 'live' }),
    );
    expect(liveWatchUrl(noIds)).toBeNull();
  });

  it('drops the fields the live card never reads', () => {
    const pruned = toLiveCardSlot(slot({ status: 'live' })) as Record<string, unknown>;
    for (const key of [
      'reasoning',
      'generic_reasoning',
      'copy_language',
      'confidence',
      'slot_kind',
      'status',
      'streamer_timezone',
      'is_predicted',
    ]) {
      expect(pruned, `${key} must not be shipped`).not.toHaveProperty(key);
    }
  });

  it('ships the normalized broadcaster language for the island’s filter', () => {
    expect(toLiveCardSlot(slot({ status: 'live', streamer_language: 'DE' })).streamer_language).toBe(
      'de',
    );
    expect(
      toLiveCardSlot(slot({ status: 'live', streamer_language: undefined })),
    ).not.toHaveProperty('streamer_language');
  });

  it('keeps what the runtime line and the favourite heart need', () => {
    const pruned = toLiveCardSlot(
      slot({ status: 'live', viewer_count: 4210, is_always_on: true }),
    );
    expect(pruned.streamer_id).toBe('streamer-1');
    expect(pruned.start_time).toBe('2026-08-01T20:00:00Z');
    expect(pruned.duration_minutes).toBe(240);
    expect(pruned.is_always_on).toBe(true);
    expect(pruned.viewer_count).toBe(4210);
  });
});
