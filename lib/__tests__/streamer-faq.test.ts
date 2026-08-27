import { describe, it, expect } from 'vitest';
import type {
  PublicStreamer,
  PublicStreamerStats,
  PublicStreamSlot,
} from '../server/partner-api';
import { buildStreamerFaqItems } from '../streamer-faq';

function makeStreamer(overrides: Partial<PublicStreamer> = {}): PublicStreamer {
  return {
    id: 'testy',
    name: 'Testy',
    platforms: ['twitch', 'youtube'],
    avatar_url: null,
    is_featured: false,
    timezone: 'Europe/Berlin',
    language: null,
    is_always_on: false,
    avg_view_count: null,
    follower_count: null,
    follower_count_updated_at: null,
    updated_at: '2026-07-01T00:00:00Z',
    last_status_change_at: null,
    twitch_login: 'testy',
    youtube_channel_id: null,
    description: null,
    ...overrides,
  };
}

function makeSlot(overrides: Partial<PublicStreamSlot> = {}): PublicStreamSlot {
  return {
    id: 'slot-1',
    streamer_id: 'testy',
    streamer_name: 'Testy',
    platforms: ['twitch'],
    title: 'A stream',
    category: null,
    thumbnail_url: null,
    avatar_url: null,
    start_time: '2026-07-18T19:00:00Z', // a Saturday
    duration_minutes: 120,
    status: 'upcoming',
    is_predicted: false,
    confidence: 'high',
    is_always_on: false,
    twitch_login: 'testy',
    youtube_channel_id: null,
    streamer_timezone: 'Europe/Berlin',
    ...overrides,
  };
}

function makeStats(overrides: Partial<PublicStreamerStats> = {}): PublicStreamerStats {
  return {
    streamer_id: 'testy',
    has_stats: true,
    window_days: 28,
    sample_size: 23,
    source: 'vod',
    timezone: 'Europe/Berlin',
    typical_start: '20:00',
    typical_end: '23:30',
    typical_duration_minutes: 195,
    streams_per_week: 5.5,
    active_days_per_week: 5,
    hours_streamed: 88.5,
    peak_viewer_count: 12345,
    weekdays: [],
    top_categories: [],
    ...overrides,
  };
}

describe('buildStreamerFaqItems — English regression guard (language: null)', () => {
  it('reproduces the legacy English copy byte-identically', () => {
    const live = makeSlot({ id: 'live-1', status: 'live', category: 'Minecraft' });
    const upcoming = makeSlot({ is_predicted: true, category: 'Fortnite' });
    const items = buildStreamerFaqItems(makeStreamer(), [live], [upcoming], makeStats());

    expect(items).toContainEqual({
      question: 'Is Testy live right now?',
      answer: 'Yes — Testy is live now streaming Minecraft on Twitch and YouTube.',
    });
    expect(items).toContainEqual({
      question: 'When does Testy usually stream?',
      answer:
        'Testy usually streams 5 days per week, typically between 20:00 and 23:30 (Berlin time). Streams typically last around 3h 15m.',
    });
    expect(items).toContainEqual({
      question: "What is Testy's stream schedule?",
      answer:
        'Testy has 1 stream on the schedule for the next 7 days. ' +
        // 19:00 UTC → 21:00 CEST: entry times are streamer-local (Europe/Berlin).
        'Next up: Sat 21:00 (Fortnite, predicted). ' +
        'All times are Berlin time. ' +
        'Times marked as predictions are estimated by AI from past streaming patterns. ' +
        'Outside these dates, Testy typically goes live around 20:00 (Berlin time) — see the typical streaming times above.',
    });
    expect(items).toContainEqual({
      question: 'How often does Testy stream?',
      answer:
        'Testy streams about 5.5 times per week on average, based on the last 28 days of broadcasts.',
    });
    expect(items).toContainEqual({
      question: 'Where can I watch Testy?',
      answer:
        'Testy streams live on Twitch and YouTube. Add Testy on Streamer Times to track their live status and upcoming streams in one place.',
    });
    expect(items).toContainEqual({
      question: 'What timezone does Testy stream in?',
      answer:
        "Testy is based in the Berlin timezone. The schedule on this page shows each stream in your local time and in Testy's local time.",
    });
  });

  it('falls back to weekday-list frequency answer without stats', () => {
    const upcoming = [
      makeSlot({ id: 'a', start_time: '2026-07-18T19:00:00Z' }), // Sat
      makeSlot({ id: 'b', start_time: '2026-07-20T19:00:00Z' }), // Mon
    ];
    const items = buildStreamerFaqItems(makeStreamer(), [], upcoming, null);
    expect(items).toContainEqual({
      question: 'How often does Testy stream?',
      answer:
        'Testy has 2 streams on the schedule for the next 7 days, on Monday and Saturday.',
    });
  });

  it('treats unknown languages as English', () => {
    const en = buildStreamerFaqItems(makeStreamer({ language: null }), [], [makeSlot()], null);
    const other = buildStreamerFaqItems(
      makeStreamer({ language: 'other' }),
      [],
      [makeSlot()],
      null,
    );
    expect(other).toEqual(en);
  });
});

describe('buildStreamerFaqItems — methodology pointer (2026-08-27)', () => {
  it('attaches the "How predictions work" link ONLY to the predicted-or-confirmed item', () => {
    const upcoming = [makeSlot({ is_predicted: true })];
    const items = buildStreamerFaqItems(makeStreamer(), [], upcoming, makeStats());
    const predicted = items.find((i) => i.question === "Are Testy's stream times predicted or confirmed?");
    expect(predicted?.more).toEqual({
      href: '/predictions',
      label: 'How predictions work',
    });
    for (const item of items) {
      if (item !== predicted) expect(item.more, item.question).toBeUndefined();
    }
  });

  it('localizes the pointer to the VIEWER locale (chrome string, D6) and keeps the answer plain', () => {
    const upcoming = [makeSlot({ is_predicted: true })];
    const items = buildStreamerFaqItems(makeStreamer({ language: 'de' }), [], upcoming, null, 'de');
    const predicted = items.find((i) => i.more);
    expect(predicted?.more).toEqual({
      href: '/de/predictions',
      label: 'Wie Prognosen entstehen',
    });
    expect(predicted?.answer).not.toMatch(/<|href/);
  });

  it('adds no pointer when nothing is predicted', () => {
    const items = buildStreamerFaqItems(makeStreamer(), [], [makeSlot({ is_predicted: false })], null);
    expect(items.some((i) => i.more)).toBe(false);
  });
});

describe('buildStreamerFaqItems — localized bodies', () => {
  const live = () => makeSlot({ id: 'live-1', status: 'live', category: 'Minecraft' });
  const upcoming = () => [
    makeSlot({ id: 'u1', is_predicted: true, category: 'Fortnite' }),
    makeSlot({ id: 'u2', start_time: '2026-07-20T19:00:00Z' }),
  ];

  it('keeps item count and order identical across languages for the same data', () => {
    const en = buildStreamerFaqItems(makeStreamer(), [live()], upcoming(), makeStats());
    for (const lang of ['de', 'ru', 'ja', 'ar', 'pl']) {
      const localized = buildStreamerFaqItems(
        makeStreamer({ language: lang }),
        [live()],
        upcoming(),
        makeStats(),
      );
      expect(localized.length, lang).toBe(en.length);
      for (const item of localized) {
        expect(item.question, lang).toContain('Testy');
        expect(item.answer, lang).not.toMatch(/undefined|\bNaN\b|\$\{/);
      }
    }
  });

  it('localizes German questions and weekday names', () => {
    const items = buildStreamerFaqItems(
      makeStreamer({ language: 'de' }),
      [],
      [
        makeSlot({ id: 'a', start_time: '2026-07-18T19:00:00Z' }), // Sat
        makeSlot({ id: 'b', start_time: '2026-07-20T19:00:00Z' }), // Mon
      ],
      null,
    );
    const howOften = items.find((i) => i.question === 'Wie oft streamt Testy?');
    expect(howOften).toBeDefined();
    expect(howOften!.answer).toContain('Montag');
    expect(howOften!.answer).toContain('Samstag');
    // Schedule entries are streamer-local (Europe/Berlin) with a localized
    // zone note — no UTC marker anymore.
    const schedule = items.find((i) => i.question.includes('Stream-Plan'));
    expect(schedule).toBeDefined();
    expect(schedule!.answer).not.toContain('UTC');
    expect(schedule!.answer).toContain('21:00'); // 19:00Z in CEST
    expect(schedule!.answer).toContain('Alle Zeiten in Ortszeit Berlin.');
    // Brands stay untranslated.
    const where = items.find((i) => i.question === 'Wo kann ich Testy anschauen?');
    expect(where!.answer).toContain('Twitch');
    expect(where!.answer).toContain('Streamer Times');
  });

  it('applies Russian plural forms to the schedule count', () => {
    const five = Array.from({ length: 5 }, (_, i) =>
      makeSlot({ id: `s${i}`, start_time: `2026-07-1${4 + i}T19:00:00Z` }),
    );
    const items = buildStreamerFaqItems(makeStreamer({ language: 'ru' }), [], five, null);
    const schedule = items.find((i) => i.answer.includes('стрим'));
    expect(schedule).toBeDefined();
    expect(schedule!.answer).toContain('5 стримов');
  });
});

describe('buildStreamerFaqItems — streamer-local schedule times', () => {
  const predicted = () => makeSlot({ is_predicted: true, category: 'Fortnite' });

  it('keeps the UTC form and omits the zone note without a usable timezone', () => {
    for (const timezone of [null, 'UTC', 'Mars/Olympus']) {
      const items = buildStreamerFaqItems(
        makeStreamer({ timezone }),
        [],
        [predicted()],
        null,
      );
      const schedule = items.find((i) => i.question.includes('schedule'));
      expect(schedule, String(timezone)).toBeDefined();
      expect(schedule!.answer, String(timezone)).toContain(
        'Next up: Sat 19:00 UTC (Fortnite, predicted).',
      );
      expect(schedule!.answer, String(timezone)).not.toContain('All times are');
    }
  });

  it('renders every entry in the streamer zone, not just the first', () => {
    const items = buildStreamerFaqItems(
      makeStreamer(),
      [],
      [
        makeSlot({ id: 'a', start_time: '2026-07-18T19:00:00Z' }), // Sat 21:00 CEST
        makeSlot({ id: 'b', start_time: '2026-07-20T17:30:00Z' }), // Mon 19:30 CEST
      ],
      null,
    );
    const schedule = items.find((i) => i.question.includes('schedule'));
    expect(schedule!.answer).toContain('Next up: Sat 21:00.');
    expect(schedule!.answer).toContain('After that: Mon 19:30.');
    expect(schedule!.answer).toContain('All times are Berlin time.');
  });

  it('shifts entry weekday AND frequency weekday across the zone midnight', () => {
    // Friday 23:30 UTC = Saturday 01:30 in Berlin.
    const items = buildStreamerFaqItems(
      makeStreamer(),
      [],
      [makeSlot({ start_time: '2026-07-17T23:30:00Z' })],
      null,
    );
    const schedule = items.find((i) => i.question.includes('schedule'));
    expect(schedule!.answer).toContain('Sat 01:30');
    const howOften = items.find((i) => i.question === 'How often does Testy stream?');
    expect(howOften!.answer).toContain('on Saturday');

    // Same instant without a timezone stays a UTC Friday.
    const utcItems = buildStreamerFaqItems(
      makeStreamer({ timezone: null }),
      [],
      [makeSlot({ start_time: '2026-07-17T23:30:00Z' })],
      null,
    );
    const utcHowOften = utcItems.find(
      (i) => i.question === 'How often does Testy stream?',
    );
    expect(utcHowOften!.answer).toContain('on Friday');
  });

  it('labels the note with the city of the streamer timezone', () => {
    const items = buildStreamerFaqItems(
      makeStreamer({ timezone: 'America/New_York' }),
      [],
      [makeSlot()], // 19:00Z → 15:00 EDT
      null,
    );
    const schedule = items.find((i) => i.question.includes('schedule'));
    expect(schedule!.answer).toContain('Next up: Sat 15:00.');
    expect(schedule!.answer).toContain('All times are New York time.');
  });
});

