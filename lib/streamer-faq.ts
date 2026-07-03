import type {
  Platform,
  PublicStreamer,
  PublicStreamerStats,
  PublicStreamSlot,
} from '@/lib/server/partner-api';
import { formatDuration, localizedNextLabel, timezoneCityLabel } from '@/lib/format/time';
import { statsLeadSentence, statsTimezoneLabel } from '@/lib/streamer-stats';

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
  stats: PublicStreamerStats | null = null,
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

  // When does {name} usually stream? — the evergreen schedule answer, backed
  // by the stats aggregation (last 28 days of history). Unlike the items below
  // it does not depend on anything being scheduled, so it keeps answering the
  // highest-volume query ("when does X stream") on otherwise quiet pages.
  if (stats && !streamer.is_always_on) {
    let answer = statsLeadSentence(name, stats);
    if (stats.typical_duration_minutes !== null) {
      answer += ` Streams typically last around ${formatDuration(stats.typical_duration_minutes)}.`;
    }
    items.push({ question: `When does ${name} usually stream?`, answer });
  }

  // What is {name}'s stream schedule? — head-on match for the highest-volume
  // query family "[streamer] stream schedule", deliberately distinct from the
  // stats-backed "usually stream" item above: this one is the concrete week
  // (confirmed + predicted slots), that one is the typical pattern. The
  // "next stream" intent stays covered by the "Next up:" sentence.
  if (upcoming.length > 0) {
    const top = upcoming.slice(0, 5);
    const n = upcoming.length;
    // "Sat 20:00 UTC (Just Chatting, predicted)" — entries joined with "; "
    // because categories and the predicted marker contain commas.
    const entries = top.map((s) => {
      const label = localizedNextLabel(s.start_time, 'en', { relative: false });
      const cat = s.category?.trim();
      const marker = s.is_predicted ? (cat ? `${cat}, predicted` : 'predicted') : cat;
      return marker ? `${label} (${marker})` : label;
    });
    let answer =
      `${name} has ${n} stream${n === 1 ? '' : 's'} on the schedule for the next 7 days. ` +
      `Next up: ${entries[0]}.`;
    if (entries.length > 1) {
      answer += ` After that: ${entries.slice(1).join('; ')}.`;
    }
    if (n > top.length) {
      answer += ` Plus ${n - top.length} more — see the full schedule above.`;
    }
    if (top.some((s) => s.is_predicted)) {
      answer +=
        ' Times marked as predictions are estimated by AI from past streaming patterns.';
    }
    if (stats?.typical_start && !streamer.is_always_on) {
      answer += ` Outside these dates, ${name} typically goes live around ${stats.typical_start} (${statsTimezoneLabel(stats)}) — see the typical streaming times above.`;
    }
    items.push({ question: `What is ${name}'s stream schedule?`, answer });
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

  // How often does {name} stream? — stats-backed when available (stable
  // 28-day frequency, no overlap with the schedule item's 7-day count);
  // falls back to the 7-day slot count for streamers without stats.
  if (streamer.is_always_on) {
    items.push({
      question: `How often does ${name} stream?`,
      answer: `${name} streams 24/7 — the channel is always live on ${platforms}.`,
    });
  } else if (stats?.streams_per_week != null) {
    items.push({
      question: `How often does ${name} stream?`,
      answer: `${name} streams about ${stats.streams_per_week} times per week on average, based on the last ${stats.window_days} days of broadcasts.`,
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
    const tz = timezoneCityLabel(streamer.timezone);
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
