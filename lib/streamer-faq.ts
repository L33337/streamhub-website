import type {
  Platform,
  PublicStreamer,
  PublicStreamSlot,
} from '@/lib/server/partner-api';
import { localizedNextLabel } from '@/lib/format/time';

export interface FaqItem {
  question: string;
  answer: string;
}

// --- Auto-generated streamer FAQ ----------------------------------------------
//
// Builds a small set of question/answer pairs for the streamer detail page from
// data already loaded for that request (no extra API calls). The point is SEO:
// unique, crawlable prose that answers high-intent queries ("when does X stream",
// "what game does X play", "is X live") so the page is eligible for featured
// snippets and "People Also Ask".
//
// We deliberately do NOT emit FAQPage JSON-LD: Google restricted FAQ rich results
// to authoritative gov/health sites in 2023 and is removing the feature entirely
// in 2026, so the schema adds no value here — only the visible text matters.
//
// Every answer embeds the streamer's real name + real schedule/platform data, so
// no two streamers produce the same text. Questions with no backing data are
// dropped entirely (never rendered with a "no data" placeholder), which keeps the
// block on the right side of Google's scaled-content-abuse policy. English only,
// to match the page's English UI chrome.

function platformsLabel(platforms: Platform[]): string {
  const names = platforms.map((p) => (p === 'twitch' ? 'Twitch' : 'YouTube'));
  if (names.length === 0) return 'Twitch and YouTube';
  return listAnd(names);
}

/** "A", "A and B", "A, B and C". */
function listAnd(items: string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

const WEEKDAY_ORDER = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

/** Distinct weekday names (UTC) the given slots fall on, in Mon→Sun order. */
function distinctWeekdays(slots: PublicStreamSlot[]): string[] {
  const present = new Set<string>();
  for (const s of slots) {
    const d = new Date(s.start_time);
    if (Number.isNaN(d.getTime())) continue;
    present.add(d.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' }));
  }
  return WEEKDAY_ORDER.filter((w) => present.has(w));
}

/** Up to `max` distinct, non-empty categories preserving first-seen order. */
function distinctCategories(slots: PublicStreamSlot[], max: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of slots) {
    const c = s.category?.trim();
    if (!c || seen.has(c.toLowerCase())) continue;
    seen.add(c.toLowerCase());
    out.push(c);
    if (out.length >= max) break;
  }
  return out;
}

export function buildStreamerFaqItems(
  streamer: PublicStreamer,
  liveSlots: PublicStreamSlot[],
  upcomingSlots: PublicStreamSlot[],
): FaqItem[] {
  const items: FaqItem[] = [];
  const name = streamer.name;
  const platforms = platformsLabel(streamer.platforms);
  const upcoming = [...upcomingSlots].sort((a, b) =>
    a.start_time.localeCompare(b.start_time),
  );
  const allSlots = [...liveSlots, ...upcoming];
  const liveSlot = liveSlots[0] ?? null;

  // Is {name} live right now? — high-intent, only when actually live.
  if (liveSlot) {
    const cat = liveSlot.category?.trim();
    items.push({
      question: `Is ${name} live right now?`,
      answer: cat
        ? `Yes — ${name} is live now streaming ${cat} on ${platforms}.`
        : `Yes — ${name} is live now on ${platforms}.`,
    });
  }

  // When does {name} stream next?
  if (upcoming.length > 0) {
    const top = upcoming.slice(0, 3);
    const labels = top.map((s) => localizedNextLabel(s.start_time, 'en', { relative: false }));
    let answer = `${name}'s next stream is ${labels[0]}`;
    if (top[0].category) answer += ` (${top[0].category})`;
    answer += '.';
    if (labels.length > 1) {
      answer += ` More upcoming streams: ${labels.slice(1).join(', ')}.`;
    }
    if (top.some((s) => s.is_predicted)) {
      answer +=
        ' Times marked as predictions are estimated by AI from past streaming patterns.';
    }
    items.push({ question: `When does ${name} stream next?`, answer });
  }

  // What games does {name} stream?
  const cats = distinctCategories(allSlots, 3);
  if (cats.length > 0) {
    items.push({
      question: `What games does ${name} stream?`,
      answer:
        cats.length === 1
          ? `${name} is currently streaming ${cats[0]}. Browse the schedule above for upcoming streams.`
          : `${name} streams ${listAnd(cats)}. Browse the schedule above to see what's coming up.`,
    });
  }

  // How often does {name} stream?
  if (streamer.is_always_on) {
    items.push({
      question: `How often does ${name} stream?`,
      answer: `${name} streams 24/7 — the channel is always live on ${platforms}.`,
    });
  } else if (upcoming.length > 0) {
    const days = distinctWeekdays(upcoming);
    const n = upcoming.length;
    const answer =
      `${name} has ${n} stream${n === 1 ? '' : 's'} on the schedule for the next 7 days` +
      (days.length > 0 ? `, on ${listAnd(days)}.` : '.');
    items.push({ question: `How often does ${name} stream?`, answer });
  }

  // Where can I watch {name}? — always available; keeps users on Streamer Times
  // rather than linking out to the platforms.
  items.push({
    question: `Where can I watch ${name}?`,
    answer: `${name} streams live on ${platforms}. Add ${name} on Streamer Times to track their live status and upcoming streams in one place.`,
  });

  // What timezone does {name} stream in? — use the city part of the IANA id
  // ("America/New_York" → "New York") for a readable sentence.
  if (streamer.timezone && !streamer.is_always_on) {
    const tz = (streamer.timezone.split('/').pop() ?? streamer.timezone).replace(/_/g, ' ');
    items.push({
      question: `What timezone does ${name} stream in?`,
      answer: `${name} is based in the ${tz} timezone. The schedule on this page shows each stream in your local time and in ${name}'s local time.`,
    });
  }

  // Are {name}'s stream times predicted or confirmed?
  const predictedCount = upcoming.filter((s) => s.is_predicted).length;
  if (predictedCount > 0) {
    const total = upcoming.length;
    const answer =
      predictedCount === total
        ? `${name}'s upcoming stream times are AI predictions based on past streaming patterns, each shown with a high, medium, or low confidence level. Confirmed times appear here once they're scheduled.`
        : `${name}'s schedule mixes AI predictions with confirmed streams. ${predictedCount} of the ${total} upcoming times are predicted from past streaming patterns, shown with a confidence level.`;
    items.push({
      question: `Are ${name}'s stream times predicted or confirmed?`,
      answer,
    });
  }

  return items;
}
