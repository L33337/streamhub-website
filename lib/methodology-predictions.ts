// Copy + constants of the public prediction-methodology page
// (/methodology/predictions, 2026-08-27). Kept out of the page component so
// vitest can guard it (meta budgets, brand spelling, structural completeness)
// without a DOM.
//
// Scope decision (2026-08-27): this page explains WHAT goes into a prediction
// and what the badges MEAN — it deliberately does NOT publish the recipe. No
// slot-computer thresholds, window lengths, retry cadences or pipeline
// architecture belong here; the only backend facts it states are the ±2h hit
// window (needed to make the hit rates meaningful) and the tier semantics.
// When the tier semantics or the scoring window change, update the sentence
// here and bump CONTENT_LAST_UPDATED['methodology-predictions'].
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
  'Where every predicted stream on Streamer Times comes from, and what the HIGH, MEDIUM and LOW badges mean.';

export const PREDICTIONS_METHODOLOGY_INTRO: readonly string[] = [
  'Most streamers don’t publish a schedule, and the ones that do don’t always keep it. Streamer Times still shows you a TV-guide-style line-up for the coming days — because we predict it. Every predicted stream carries a confidence badge and is built from evidence about that particular channel. This page explains how, in plain language.',
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
      'What the channel has actually streamed in recent weeks: on which weekdays, at what time of day, for how long, and how often. This is the backbone of every prediction.',
    ],
  },
  {
    id: 'announcements',
    title: 'Announced schedules',
    paragraphs: [
      'The streamer’s own Twitch schedule and scheduled YouTube broadcasts — weighted by how reliably that streamer has kept them in the past. Changes to the schedule are picked up automatically.',
    ],
  },
  {
    id: 'said-on-stream',
    title: 'What the streamer said',
    paragraphs: [
      'Where captions are available, announcements the streamer made on their last stream: “see you Thursday”, “no stream tomorrow”, “taking a week off”. Only their own words. The quote behind a prediction is shown in its “Why this prediction” box.',
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
    'A fixed set of rules — the same for every channel — turns that evidence into a line-up for the coming days. What the streamer said outranks their published schedule, and the schedule outranks the pattern in their history. When the evidence is too thin or too scattered to call, we show nothing rather than a guess.',
    'Only then does an AI writer turn those facts into the short title and description on each card, in the streamer’s own language — it cannot move a time or change a badge.',
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
      'A regular weekday with consistent start times',
      'or an announced slot from a streamer who keeps their schedule',
      'or a clear announcement on the last stream',
    ],
    inPractice:
      'About three out of four high-confidence predictions start within two hours of the predicted time.',
  },
  {
    level: 'medium',
    tagline: 'A real pattern with a real question mark.',
    signals: [
      'A regular weekday, but start times that vary',
      'An announcement from a streamer with a mixed track record, or a vague hint on stream',
      'A second stream of the day, or the first days back after a break',
    ],
    inPractice: 'Roughly every second medium-confidence prediction hits the two-hour window.',
  },
  {
    level: 'low',
    tagline: 'A possibility, not a promise.',
    signals: [
      'A weekday the channel rarely streams on',
      'Very little history yet',
      'A recent quiet spell',
    ],
    inPractice:
      'About one in three low-confidence predictions comes true. LOW says little about the streamer and a lot about how much evidence we have.',
  },
];

export const CONFIDENCE_INTRO: readonly string[] = [
  'Every predicted stream has one of three badges. They describe how much evidence sits behind the time — not how good the streamer is. A prediction counts as a hit when the stream starts within two hours of the predicted time.',
];

export const CONFIDENCE_FEEDBACK =
  'Confidence also learns from misses: when a streamer skips predicted streams, their next predictions drop a level and are marked UNCERTAIN until they stream again.';

/** Live calibration box copy (numbers come from lib/server/prediction-accuracy.ts). */
export const CALIBRATION_HEADING = 'Prediction check — the last 7 days';
export const CALIBRATION_NOTE =
  'Counted the way we grade ourselves: a hit is a stream that started within two hours of the predicted time. Updated hourly.';
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
    body: 'A day the channel doesn’t usually stream on — added because the streamer announced it.',
  },
  {
    id: 'uncertain',
    title: 'Uncertain',
    body: 'The streamer recently skipped predicted streams; the confidence has been lowered.',
  },
  {
    id: 'cancelled',
    title: 'Cancelled / No stream expected',
    body: 'A usually-regular slot we expect to stay empty — an announced break, a withdrawn schedule or an unusually long silence.',
  },
  {
    id: 'live',
    title: 'Live',
    body: 'Real-time data, not a prediction. The moment a channel goes live, its prediction is replaced by the live entry.',
  },
];

export const OTHER_BADGES_NOTE =
  'NEW and UNCERTAIN appear in the app and the signed-in Program view; the public website shows the confidence badge and “no stream expected” entries.';

export const WHEN_PREDICTIONS_CHANGE: MethodologySection = {
  id: 'updates',
  heading: 'When predictions change',
  paragraphs: [],
  bullets: [
    'After every stream: shortly after a broadcast ends, the channel’s line-up is recomputed.',
    'When the announced schedule changes.',
    'Regularly for quiet channels, so a stale line-up doesn’t linger.',
    'When the real stream starts: the prediction becomes a LIVE entry.',
  ],
  afterBullets: [
    'Each run replaces the previous line-up. Times are computed in the streamer’s own timezone and shown in yours.',
  ],
};

export const HOW_WE_GRADE: MethodologySection = {
  id: 'how-we-grade-ourselves',
  heading: 'How we grade ourselves',
  paragraphs: [
    'Every prediction is scored against what actually happened, and the scores are public — the “Prediction check” on our home page and the figures above come straight from them. A hit is a stream that started within two hours of the predicted time; a stream that never came is a miss; “no stream expected” entries are scored the other way round. The scores feed back into the badges.',
  ],
};

export const LIMITS: MethodologySection = {
  id: 'limits',
  heading: 'What we can’t predict',
  paragraphs: [
    'A prediction is a well-founded expectation, never a guarantee — spontaneous streams, sudden cancellations and platform outages are exactly what no history can foresee. A few limits worth knowing:',
  ],
  bullets: [
    'Categories come from Twitch; YouTube only reports broad buckets such as “Gaming”.',
    'What a streamer said is only available where captions can be read.',
    'A channel we have only just started tracking begins with cautious predictions until its first streams have been observed.',
    'Predictions cover the coming week; beyond that, the typical streaming times on a streamer’s page are the better guide.',
  ],
};

export const FOR_STREAMERS: MethodologySection = {
  id: 'for-streamers',
  heading: 'For streamers: how to get better predictions for your channel',
  paragraphs: ['The system rewards exactly what viewers appreciate anyway:'],
  bullets: [
    'Keep a Twitch schedule and follow it — that earns HIGH-confidence slots and a place on the most punctual streamers ranking.',
    'Say when you’ll be back before you end a stream, and announce breaks.',
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
      'Strong, recent evidence — a regular weekday with consistent start times, a punctual streamer’s announced slot, or a clear announcement on stream. About three out of four such predictions start within two hours of the predicted time.',
  },
  {
    question: 'Does LOW confidence mean the streamer is unreliable?',
    answer:
      'No. LOW means we have little evidence for that particular day — a rarely used weekday, a short history, or a recent quiet spell — not that the streamer is unreliable.',
  },
  {
    question: 'Why did a prediction change or disappear?',
    answer:
      'Predictions are recomputed after every stream and whenever the schedule changes, and each run replaces the last. A prediction also disappears when the real stream starts or the streamer announces a break.',
  },
  {
    question: 'Why is there no prediction for a streamer I follow?',
    answer:
      'The channel has been quiet for a while, has very little history, streams at times too scattered to call, or announced a break. We would rather show nothing than guess — live status and go-live alerts work regardless.',
  },
  {
    question: 'How much of this is AI?',
    answer:
      'AI reads the announcements a streamer made on stream and writes the text on each card. The timing, the confidence and the decision whether to predict at all follow fixed rules, applied the same way to every channel.',
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
  HOW_WE_GRADE,
  LIMITS,
  FOR_STREAMERS,
];
