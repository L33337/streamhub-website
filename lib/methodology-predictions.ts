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
// everywhere (brand rule). No em/en dashes in any user-facing string (user
// rule 2026-08-27: they read as machine-written; vitest enforces it on this
// module) and hyphens only where English needs them. No FAQPage JSON-LD
// anywhere on the site — the FAQ below is visible text only (see
// lib/streamer-faq.ts for the rationale).
//
// GEO note: the intro's second paragraph and each confidence paragraph are
// written as self-contained definitions ("Streamer Times predicts … from
// three sources", "HIGH means …") so an answer engine can quote them
// without the surrounding page.

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
// en-only content pages (support, methodology/income-estimates). The hyphen
// in the suffix is the site-wide title convention, not prose.
export const PREDICTIONS_METHODOLOGY_TITLE =
  'How Predictions & Confidence Levels Work - Streamer Times';
// ≤ 155 chars (lib/seo.ts MAX_META_DESCRIPTION).
export const PREDICTIONS_METHODOLOGY_DESCRIPTION =
  'How Streamer Times predicts when Twitch and YouTube streamers go live, and what the HIGH, MEDIUM and LOW confidence badges on every predicted stream mean.';

export const PREDICTIONS_METHODOLOGY_H1 = 'How we predict when streamers go live';
export const PREDICTIONS_METHODOLOGY_SUBTITLE =
  'Where every predicted stream on Streamer Times comes from, and what the HIGH, MEDIUM and LOW badges mean.';

export const PREDICTIONS_METHODOLOGY_INTRO: readonly string[] = [
  'Most streamers don’t publish a schedule, and the ones that do don’t always keep it. Streamer Times still shows you a TV guide for the coming days, because we predict it.',
  'Streamer Times predicts when a Twitch or YouTube streamer will go live from three sources: the channel’s broadcast history, its announced schedule, and what the streamer said on their last stream. Every predicted stream carries a HIGH, MEDIUM or LOW confidence badge that tells you how much evidence sits behind the time. This page explains how it works, in plain language.',
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
      'The streamer’s own Twitch schedule and scheduled YouTube broadcasts, weighted by how reliably that streamer has kept them in the past. Changes to the schedule are picked up automatically.',
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
    'A fixed set of rules, the same for every channel, turns that evidence into a lineup for the coming days. What the streamer said outranks their published schedule, and the schedule outranks the pattern in their history. When the evidence is too thin or too scattered to call, we show nothing rather than a guess.',
    'Only then does an AI writer turn those facts into the short title and description on each card, in the streamer’s own language. It cannot move a time or change a badge.',
  ],
};

export interface ConfidenceTierCopy {
  level: ConfidenceLevel;
  /** One-line characterisation shown next to the badge. */
  tagline: string;
  /**
   * One self-contained paragraph: what earns the badge and, rounded, how
   * often it has come true. Starts with the badge name so it quotes well.
   */
  body: string;
}

// Tone (2026-08-27): a viewer's quick guide, not admission criteria. Prose
// rather than bullets since 2026-08-27 evening so each tier reads as one
// quotable definition.
export const CONFIDENCE_TIERS_COPY: readonly ConfidenceTierCopy[] = [
  {
    level: 'high',
    tagline: 'Plan your evening around it.',
    body: 'HIGH means the evidence is strong: a streamer with a routine you can set your watch by, a published schedule they actually stick to, or a promise made on stream such as “see you Thursday”. It is our most dependable call. About three out of four HIGH predictions start within two hours of the predicted time.',
  },
  {
    level: 'medium',
    tagline: 'A good bet worth keeping an eye on.',
    body: 'MEDIUM means the pattern is real but one thing is still open: a familiar streaming day with a start time that moves around, a schedule the streamer mostly keeps, or a hint on stream rather than a promise. Roughly every second MEDIUM prediction lands within two hours of the predicted time, so set an alert and let the app do the watching.',
  },
  {
    level: 'low',
    tagline: 'Possible, not promised.',
    body: 'LOW means we simply don’t know much yet: an unusual day for this channel, a streamer we are still getting to know, or one who has gone quiet for a while. About one in three LOW predictions comes true. Treat it as a heads up, not a verdict. It says more about how much we know than about the streamer.',
  },
];

export const CONFIDENCE_INTRO: readonly string[] = [
  'Every predicted stream has one of three badges. They describe how much evidence sits behind the time, not how good the streamer is. A prediction counts as a hit when the stream starts within two hours of the predicted time.',
];

/**
 * Live calibration section copy (numbers come from
 * lib/server/prediction-accuracy.ts). Rendered as its own section with an H2
 * since 2026-08-27 evening; the section hides entirely when no tier has data.
 */
export const CALIBRATION_HEADING = 'Prediction check: the last 7 days';
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
    body: 'A day the channel doesn’t usually stream on, added because the streamer announced it.',
  },
  {
    id: 'uncertain',
    title: 'Uncertain',
    body: 'The streamer recently skipped predicted streams; the confidence has been lowered.',
  },
  {
    id: 'cancelled',
    title: 'Cancelled / No stream expected',
    body: 'A normally regular slot we expect to stay empty: an announced break, a withdrawn schedule or an unusually long silence.',
  },
  {
    id: 'live',
    title: 'Live',
    body: 'Live data, not a prediction. The moment a channel goes live, its prediction is replaced by the live entry.',
  },
];

export const OTHER_BADGES_NOTE =
  'NEW and UNCERTAIN appear in the app and in the Program view once you are signed in; the public website shows the confidence badge and “no stream expected” entries.';

export const HOW_WE_GRADE: MethodologySection = {
  id: 'how-we-grade-ourselves',
  heading: 'How we measure prediction accuracy',
  paragraphs: [
    'Every prediction is scored against what actually happened, and the scores are public: the “Prediction check” on our home page and the figures above come straight from them. A hit is a stream that started within two hours of the predicted time. A stream that never came is a miss. “No stream expected” entries are scored the other way round. The scores feed back into the badges.',
  ],
};

export const LIMITS: MethodologySection = {
  id: 'limits',
  heading: 'What we can’t predict',
  paragraphs: [
    'A prediction is an expectation with good evidence behind it, never a guarantee. Spontaneous streams, sudden cancellations and platform outages are exactly what no history can foresee. Two limits worth knowing:',
  ],
  bullets: [
    'Categories come from Twitch; YouTube only reports broad buckets such as “Gaming”.',
    'What a streamer said is only available where captions can be read.',
  ],
};

export const FOR_STREAMERS: MethodologySection = {
  id: 'for-streamers',
  heading: 'For streamers: how to get better predictions for your channel',
  paragraphs: ['The system rewards exactly what viewers appreciate anyway:'],
  bullets: [
    'Keep a Twitch schedule and follow it. That earns HIGH slots and a place on the most punctual streamers ranking.',
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
      'HIGH means strong, recent evidence: a streamer with a routine you can set your watch by, a schedule they stick to, or a promise made on stream. About three out of four HIGH predictions start within two hours of the predicted time.',
  },
  {
    question: 'Does LOW confidence mean the streamer is unreliable?',
    answer:
      'No. LOW means we have little evidence for that particular day, such as an unusual weekday, a short history or a recent quiet spell. It says nothing about the streamer’s reliability.',
  },
  {
    question: 'Why did a prediction change or disappear?',
    answer:
      'Predictions are recomputed after every stream and whenever the schedule changes, and each run replaces the last. A prediction also disappears when the real stream starts or the streamer announces a break.',
  },
  {
    question: 'Why is there no prediction for a streamer I follow?',
    answer:
      'The channel has been quiet for a while, has very little history, streams at times too scattered to call, or announced a break. We would rather show nothing than guess. Live status and the alerts in the app work regardless.',
  },
  {
    question: 'How much of this is AI?',
    answer:
      'AI reads the announcements a streamer made on stream and writes the text on each card. The timing, the confidence and the decision whether to predict at all follow fixed rules, applied the same way to every channel.',
  },
  {
    question: 'Can I get notified when a predicted stream actually starts?',
    answer:
      'Yes. The Streamer Times app alerts you the moment a favourite channel starts streaming, so a prediction only ever has to get you close.',
  },
];

/** Every long-form section in render order (for tests + the in-page nav). */
export const PREDICTIONS_METHODOLOGY_SECTIONS: readonly MethodologySection[] = [
  HOW_IT_IS_BUILT,
  HOW_WE_GRADE,
  LIMITS,
  FOR_STREAMERS,
];
