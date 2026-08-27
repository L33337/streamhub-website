// Copy + constants of the public prediction-methodology page
// (/methodology/predictions, 2026-08-27). Kept out of the page component so
// vitest can guard it (meta budgets, brand spelling, structural completeness)
// without a DOM.
//
// This page DESCRIBES what the StreamHub backend does — every threshold below
// is mirrored by hand from supabase/functions/_shared/slot-computer.ts,
// _shared/schedule-reliability.ts and the ±2h scoring in
// check-live-streams/conflicts.ts (+ the eventsub/websub twins). When one of
// those numbers changes, change the sentence here in the same PR and bump
// CONTENT_LAST_UPDATED['methodology-predictions'] in lib/legal-dates.ts.
//
// Register: the site's informal English. "Streamer Times" with the space
// everywhere (brand rule). No FAQPage JSON-LD anywhere on the site — the FAQ
// below is visible text only (see lib/streamer-faq.ts for the rationale).

import type { ConfidenceLevel } from '@/lib/server/partner-api';
import { CONTENT_LAST_UPDATED, formatLegalDate } from '@/lib/legal-dates';

export const PREDICTIONS_METHODOLOGY_PATH = '/methodology/predictions';

/** ISO date of the last content change — also the sitemap <lastmod>. */
export const PREDICTIONS_METHODOLOGY_UPDATED_ISO = CONTENT_LAST_UPDATED['methodology-predictions'];
/** First publication, for Article JSON-LD datePublished. Never moves. */
export const PREDICTIONS_METHODOLOGY_PUBLISHED_ISO = '2026-08-27';
export const PREDICTIONS_METHODOLOGY_UPDATED_LABEL = formatLegalDate(
  PREDICTIONS_METHODOLOGY_UPDATED_ISO,
);

// <title> ≤ 60 chars incl. the " - Streamer Times" suffix used by the other
// en-only content pages (support, methodology/income-estimates).
export const PREDICTIONS_METHODOLOGY_TITLE =
  'How Predictions & Confidence Levels Work - Streamer Times';
// ≤ 155 chars (lib/seo.ts MAX_META_DESCRIPTION).
export const PREDICTIONS_METHODOLOGY_DESCRIPTION =
  'How Streamer Times predicts when Twitch and YouTube streamers go live, and what the HIGH, MEDIUM and LOW confidence badges on every predicted stream mean.';

export const PREDICTIONS_METHODOLOGY_H1 = 'How we predict when streamers go live';
export const PREDICTIONS_METHODOLOGY_SUBTITLE =
  'The evidence behind every predicted stream on Streamer Times, how a prediction is built, and what the HIGH, MEDIUM and LOW badges actually mean.';

export const PREDICTIONS_METHODOLOGY_INTRO: readonly string[] = [
  'Most streamers don’t publish a schedule, and the ones that do don’t always keep it. Streamer Times still shows you a TV-guide-style line-up for the coming week — because we predict it. Every predicted stream carries a confidence badge, and every prediction can be traced back to evidence: what the channel has actually broadcast, what it has announced, and what the streamer said on stream.',
  'This page explains the whole process in plain language. It describes exactly what our system does today; when the rules change, the date at the top changes with them.',
];

export interface MethodologySource {
  /** Stable anchor id. */
  id: string;
  title: string;
  paragraphs: readonly string[];
}

export const PREDICTION_SOURCES: readonly MethodologySource[] = [
  {
    id: 'history',
    title: 'Broadcast history',
    paragraphs: [
      'Every stream a tracked channel has actually broadcast in the last four weeks: on which weekdays, at what time, for how long, and how often per day. This is the backbone of every prediction. Twitch and YouTube recordings are matched to the live broadcasts we observed, so a stream that ran on both platforms at once counts once.',
      'After a longer break we widen the window to eight weeks, so a returning streamer is judged on their real routine rather than on an empty month.',
    ],
  },
  {
    id: 'announcements',
    title: 'Announced schedules',
    paragraphs: [
      'The streamer’s own Twitch schedule and scheduled YouTube broadcasts. An announcement is only as good as the streamer’s track record with it, so we measure that too: for every announced slot we check whether the channel went live within 30 minutes of the announced time. Streamers who honour at least three out of four recent announcements count as punctual; below 40 % we treat the schedule as a rough hint and rely on the pattern instead.',
      'Schedule changes are picked up within about half an hour. A newly added slot becomes a prediction; a removed one becomes a “no stream expected” entry.',
    ],
  },
  {
    id: 'said-on-stream',
    title: 'What the streamer said on stream',
    paragraphs: [
      'Where captions or audio are available, we read the closing part of the last broadcast — the moment streamers usually say when they’ll be back. An AI model extracts concrete statements: “see you Thursday at 8”, “no stream tomorrow”, “taking two weeks off”, “next week we start the new season”.',
      'Only the most recent stream is used, and only the streamer’s own words — nothing is inferred from chat or from other channels. The quote that drove a prediction is shown in its “Why this prediction” box.',
    ],
  },
];

export interface MethodologySection {
  id: string;
  heading: string;
  paragraphs: readonly string[];
  bullets?: readonly string[];
  /** Paragraphs rendered after the bullet list. */
  afterBullets?: readonly string[];
}

export const HOW_IT_IS_BUILT: MethodologySection = {
  id: 'how-it-is-built',
  heading: 'How the sources become a prediction',
  paragraphs: [
    'Combining the sources is deliberately not left to an AI. A fixed set of rules — the same for every channel — turns the evidence into a line-up for today and the next seven days. That keeps predictions consistent, explainable, and cheap to recompute after every single stream.',
  ],
  bullets: [
    'Weekdays: a weekday on which the channel streamed in at least three of the last four weeks is a regular day. One or two appearances make it a rare day; none makes it an off day.',
    'Start time: the typical start on that weekday, taken from the recent starts themselves. When a weekday has only a handful of samples we blend it with the channel’s overall typical start, so one late night doesn’t drag the estimate. Punctual streamers who habitually go live 20 minutes after their announced time get their announced slots shifted by that habit.',
    'Duration: the typical length of that weekday’s streams, falling back to the channel’s overall typical length.',
    'Second streams: channels that usually stream more than once on a given weekday get a second (occasionally a third) slot, one confidence level below the first.',
    'Category: what the streamer said comes first, then an announced category from a streamer who sticks to announced categories, then the game they played most recently.',
    'Conflicts: what the streamer said beats everything else. An explicit “no stream Monday” removes Monday even if it’s the channel’s most regular day; a withdrawn announcement outranks the pattern; an announced slot outranks the pattern only when the streamer’s track record justifies it.',
  ],
  afterBullets: [
    'Sometimes the honest prediction is none at all. We deliberately skip a weekday when the recent starts on it are scattered across more than five hours with no recognisable cluster, when the channel has been silent for three weeks, or when there are only one or two streams of history to go on. A coin flip presented as a schedule would cost you more trust than an empty slot.',
    'Only once the day, time, duration and confidence are fixed does an AI writer get involved — to turn those facts into the short title and description on each card, in the streamer’s own language. The writer cannot move a time or change a badge.',
  ],
};

export interface ConfidenceTierCopy {
  level: ConfidenceLevel;
  /** One-line characterisation shown next to the badge. */
  tagline: string;
  /** What earns the badge. */
  signals: readonly string[];
  /** What it has meant in practice (rounded, evergreen wording). */
  inPractice: string;
}

export const CONFIDENCE_TIERS_COPY: readonly ConfidenceTierCopy[] = [
  {
    level: 'high',
    tagline: 'Strong, recent evidence.',
    signals: [
      'A regular weekday (three of the last four weeks) with starts that cluster within about an hour of each other',
      'or an announced slot from a punctual streamer',
      'or a clear announcement on stream with a known time (“Friday at 8”)',
    ],
    inPractice:
      'In practice, about three out of four high-confidence predictions start within two hours of the predicted time.',
  },
  {
    level: 'medium',
    tagline: 'A real pattern with a real question mark.',
    signals: [
      'A regular weekday, but start times that vary',
      'An announced slot from a streamer with a mixed track record',
      'A vague hint on stream (“probably Thursday”), or a day announced without a time',
      'The second stream of a day, or the first week back after a break',
    ],
    inPractice: 'Roughly every second medium-confidence prediction lands in the two-hour window.',
  },
  {
    level: 'low',
    tagline: 'We’re showing you a possibility, not a promise.',
    signals: [
      'A weekday seen only once or twice in the last four weeks',
      'Very little history yet — for example a channel we started tracking recently',
      'No stream for two weeks or more, or a channel much quieter than its usual rhythm',
    ],
    inPractice:
      'About one in three low-confidence predictions comes true. LOW says little about the streamer and a lot about how much evidence we have — when in doubt, open the “Why this prediction” box or turn on go-live alerts in the app.',
  },
];

export const CONFIDENCE_INTRO: readonly string[] = [
  'Every predicted stream has one of three badges. They describe how much evidence sits behind the time — not how good the streamer is. Read them as odds: a prediction counts as a hit when the stream starts within two hours of the predicted time.',
];

export const CONFIDENCE_FEEDBACK =
  'Confidence also learns from misses. After two consecutive predicted streams that never happened, the next pattern-based prediction drops one level and is marked UNCERTAIN; after three it drops to LOW. A fresh announcement, or a stream on the day, resets the streak.';

/** Live calibration box copy (numbers come from lib/server/prediction-accuracy.ts). */
export const CALIBRATION_HEADING = 'Prediction check — the last 7 days';
export const CALIBRATION_NOTE =
  'Counted exactly the way we grade ourselves: a hit is a stream that started within two hours of the predicted time. Updated hourly from every graded prediction of the past week.';
export const CALIBRATION_ROW = (hits: number, total: number): string =>
  `${hits.toLocaleString('en-US')} of ${total.toLocaleString('en-US')} predictions hit the window`;

export interface BadgeCopy {
  id: 'new' | 'uncertain' | 'cancelled' | 'live';
  title: string;
  body: string;
}

export const OTHER_BADGES: readonly BadgeCopy[] = [
  {
    id: 'new',
    title: 'New',
    body: 'A prediction on a day the channel doesn’t usually stream — added because the streamer announced it, on stream or in their schedule.',
  },
  {
    id: 'uncertain',
    title: 'Uncertain',
    body: 'The streamer skipped their last two or more predicted streams; the confidence has been lowered accordingly.',
  },
  {
    id: 'cancelled',
    title: 'Cancelled / No stream expected',
    body: 'A usually-regular slot we expect to stay empty: the streamer announced a break, removed the slot from their schedule, set a vacation, or has gone unusually quiet. Shown so you don’t wait for a stream that isn’t coming.',
  },
  {
    id: 'live',
    title: 'Live',
    body: 'Real-time data, not a prediction. The moment a channel goes live, its prediction for that time is replaced by the live entry.',
  },
];

export const OTHER_BADGES_NOTE =
  'NEW and UNCERTAIN appear in the Streamer Times app and in the signed-in Program view; the public pages on this website show the confidence badge and “no stream expected” entries.';

export const WHEN_PREDICTIONS_CHANGE: MethodologySection = {
  id: 'updates',
  heading: 'When predictions change',
  paragraphs: [],
  bullets: [
    'After every stream: once a broadcast ends and its recording is available, the channel’s line-up is recomputed — typically within about 15 minutes, occasionally later the same day when the recording or its captions take longer to appear.',
    'When the schedule changes: announced slots are checked every 30 minutes; an added, moved or removed slot triggers a fresh prediction for streamers with a punctual track record.',
    'Daily for quiet channels: a streamer without a stream in the past week gets a refresh, so a stale line-up doesn’t linger.',
    'When the real stream starts: the prediction is replaced by the live entry, and the confidence badge disappears with it.',
  ],
  afterBullets: [
    'Each run replaces the previous line-up rather than stacking on top of it, so you never see two predictions for the same evening. Times are computed in the streamer’s own timezone — daylight-saving changes included — and shown in yours.',
  ],
};

export const NEW_CHANNELS: MethodologySection = {
  id: 'new-channels',
  heading: 'New channels without history',
  paragraphs: [
    'A channel we’ve just started tracking has no broadcasts to learn from. For those we ask an AI model to research the channel’s public schedule on the web and produce a first line-up. Those predictions are capped at MEDIUM confidence — research is a good start, but only observed streams justify HIGH — and they are replaced by pattern-based predictions as soon as the first real broadcasts have been recorded.',
  ],
};

export const HOW_WE_GRADE: MethodologySection = {
  id: 'how-we-grade-ourselves',
  heading: 'How we grade ourselves',
  paragraphs: [
    'Every prediction is scored against what actually happened, and those scores are public: the “Prediction check” card on our home page and the figures above come straight from them.',
  ],
  bullets: [
    'A hit: the channel went live within two hours of the predicted start.',
    'A miss: the stream started more than two hours off, or six hours passed with no stream at all.',
    '“No stream expected” entries are scored the other way round: staying offline is the correct call, and streaming anyway counts against us.',
    'A prediction replaced by a newer run before its time isn’t scored — only the prediction still standing when the time came counts.',
  ],
  afterBullets: [
    'The scores feed back into the system. They set the UNCERTAIN badge, and they tell us which rules to tighten — the five-hour scatter rule and the lower confidence after a break both came out of this data. They are also the number we would rather show you than a marketing claim.',
  ],
};

export const LIMITS: MethodologySection = {
  id: 'limits',
  heading: 'What we can’t predict',
  paragraphs: [
    'A prediction is a well-founded expectation, never a guarantee. Spontaneous streams, sudden cancellations, illness and platform outages are exactly the things no history can foresee. A few known limits worth knowing about:',
  ],
  bullets: [
    'Categories come from Twitch. YouTube only reports broad buckets such as “Gaming”, so a YouTube-only channel’s predicted category is coarser.',
    'What a streamer said on stream is only available where captions or audio can be read; channels without them rely on history and schedules alone.',
    'A channel that streams at wildly different times each week may get no prediction for some weekdays — on purpose.',
    'Predictions cover today and the next seven days. Beyond that, the typical streaming times on a streamer’s page are the better guide.',
  ],
};

export const FOR_STREAMERS: MethodologySection = {
  id: 'for-streamers',
  heading: 'For streamers: how to get better predictions for your channel',
  paragraphs: ['The system rewards exactly what viewers appreciate anyway:'],
  bullets: [
    'Keep a Twitch schedule and actually follow it. Punctual streamers get HIGH-confidence slots straight from their announcements — and a place on the most punctual streamers ranking.',
    'Say when you’ll be back before you end a stream. A clear “back Thursday at 8” becomes a HIGH-confidence prediction the same day.',
    'Announce breaks. A “no stream next week” turns into “no stream expected” entries instead of a string of misses that lower your confidence.',
    'Consistency beats frequency: three streams a week at the same time predict better than daily streams at random hours.',
  ],
};

export interface MethodologyFaq {
  question: string;
  answer: string;
}

export const PREDICTIONS_FAQ: readonly MethodologyFaq[] = [
  {
    question: 'What does a HIGH confidence badge mean?',
    answer:
      'That the prediction rests on strong, recent evidence — a regular weekday with consistent start times, a punctual streamer’s announced slot, or a clear announcement on stream — and that about three out of four such predictions start within two hours of the predicted time.',
  },
  {
    question: 'Does LOW confidence mean the streamer is unreliable?',
    answer:
      'No. LOW means we have little evidence for that particular day: a rarely used weekday, a short history, or a recent quiet spell. The most punctual streamer on the platform still gets a LOW badge for a weekday they have streamed on once.',
  },
  {
    question: 'Why did a prediction change or disappear?',
    answer:
      'Predictions are recomputed after every stream and whenever the announced schedule changes, and each run replaces the last. A prediction also disappears when the real stream starts — it becomes a LIVE entry — or when the streamer announces a break.',
  },
  {
    question: 'Why is there no prediction for a streamer I follow?',
    answer:
      'Usually one of four reasons: the channel has been silent for three weeks or more, it has only a stream or two of history, its start times are too scattered to call, or the streamer announced a break. In all four cases we would rather show nothing than guess. Live status and go-live alerts work regardless.',
  },
  {
    question: 'Why does the predicted time differ from the streamer’s announced schedule?',
    answer:
      'Because we have measured the difference. If a streamer habitually goes live 20 minutes after their announced time, we predict the time they actually start. Streamers with a poor track record on their schedule are predicted from their real pattern instead.',
  },
  {
    question: 'How much of this is AI?',
    answer:
      'Two parts. An AI model reads the closing minutes of the last stream for announcements, and another writes the title and description text on each card. The timing, the confidence and the decision whether to predict at all are fixed rules, applied identically to every channel.',
  },
  {
    question: 'Where can I see why a specific stream was predicted?',
    answer:
      'Open the stream: every predicted slot has a “Why this prediction” box with the evidence — how often the channel streamed on that weekday, whether it is on the schedule, and the quote from the stream if there was one.',
  },
  {
    question: 'Can I get notified when a predicted stream actually starts?',
    answer:
      'Yes. The Streamer Times app sends a go-live alert the moment a favourite channel starts streaming, so a prediction only ever has to get you close.',
  },
];

/** Every long-form section in render order (for tests + the in-page nav). */
export const PREDICTIONS_METHODOLOGY_SECTIONS: readonly MethodologySection[] = [
  HOW_IT_IS_BUILT,
  WHEN_PREDICTIONS_CHANGE,
  NEW_CHANNELS,
  HOW_WE_GRADE,
  LIMITS,
  FOR_STREAMERS,
];
