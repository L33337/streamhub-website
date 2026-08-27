import type {
  Platform,
  PublicStreamer,
  PublicStreamerStats,
  PublicStreamSlot,
} from '@/lib/server/partner-api';
import {
  formatDuration,
  localizedNextLabel,
  safeTimeZone,
  timezoneCityLabel,
} from '@/lib/format/time';
import { listConjunction, localeHref, resolveUiLang, weekdayLong } from '@/lib/i18n-core';
import { chromeLexFor } from '@/lib/i18n-chrome';
import { uiLexFor } from '@/lib/i18n-ui';
import { statsLeadSentence, statsTimezoneLabel } from '@/lib/streamer-stats';

export interface FaqItem {
  question: string;
  answer: string;
  /**
   * Optional "read more" pointer rendered after the answer (2026-08-27) —
   * kept OUT of `answer` so the lexicon strings stay plain text.
   */
  more?: { href: string; label: string };
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
// block on the right side of Google's scaled-content-abuse policy.
//
// Localized to the streamer's language via lib/i18n-ui.ts (body-localization,
// 2026-07): a German streamer's page answers "wann streamt X?" in German — the
// language its search queries arrive in. English streamers (and unknown
// languages) keep the original English wording byte-identically.

function platformsLabel(platforms: Platform[], lang: string): string {
  const names = platforms.map((p) => (p === 'twitch' ? 'Twitch' : 'YouTube'));
  if (names.length === 0) return listConjunction(['Twitch', 'YouTube'], lang);
  return listConjunction(names, lang);
}

const SHORT_EN_WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** ISO weekday index (0 = Monday … 6 = Sunday) in `tz`, or UTC when tz is null. */
function isoWeekdayIndex(d: Date, tz: string | null): number {
  if (tz) {
    const short = new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      timeZone: tz,
    }).format(d);
    const idx = SHORT_EN_WEEKDAYS.indexOf(short);
    if (idx >= 0) return idx;
  }
  return (d.getUTCDay() + 6) % 7;
}

/**
 * Localized long weekday names the given slots fall on, in Mon→Sun order —
 * streamer-local when `tz` is set (a 23:30 UTC Friday stream is a Saturday
 * stream in Berlin), UTC otherwise.
 */
function distinctWeekdayLabels(
  slots: PublicStreamSlot[],
  lang: string,
  tz: string | null,
): string[] {
  const present = new Set<number>();
  for (const s of slots) {
    const d = new Date(s.start_time);
    if (Number.isNaN(d.getTime())) continue;
    present.add(isoWeekdayIndex(d, tz));
  }
  return [...present].sort((a, b) => a - b).map((i) => weekdayLong(i, lang));
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
  // M22 (D6): FAQ copy follows the viewer's locale; defaults to the
  // streamer's language for pre-M22 callers.
  uiLanguage: string | null = null,
): FaqItem[] {
  const items: FaqItem[] = [];
  const name = streamer.name;
  const ui = uiLanguage ?? streamer.language;
  const lang = resolveUiLang(ui);
  const lex = uiLexFor(ui);
  const L = lex.faq;
  const platforms = platformsLabel(streamer.platforms, lang);
  // Schedule-entry times render in the streamer's fixed home timezone (matches
  // the streamer-local "typical times" sentence and the searcher's own clock).
  // Fixed zone → still deterministic and ISR/Google-cacheable. Null/'UTC'/
  // invalid → UTC rendering as before.
  const tz = safeTimeZone(streamer.timezone);
  const upcoming = [...upcomingSlots].sort((a, b) =>
    a.start_time.localeCompare(b.start_time),
  );
  const allSlots = [...liveSlots, ...upcoming];
  const liveSlot = liveSlots[0] ?? null;

  // Is {name} live right now? — high-intent, only when actually live.
  if (liveSlot) {
    const cat = liveSlot.category?.trim();
    items.push({
      question: L.qIsLive(name),
      answer: cat ? L.aIsLiveCat(name, cat, platforms) : L.aIsLive(name, platforms),
    });
  }

  // When does {name} usually stream? — the evergreen schedule answer, backed
  // by the stats aggregation (last 28 days of history). Unlike the items below
  // it does not depend on anything being scheduled, so it keeps answering the
  // highest-volume query ("when does X stream") on otherwise quiet pages.
  if (stats && !streamer.is_always_on) {
    let answer = statsLeadSentence(name, stats, ui);
    if (stats.typical_duration_minutes !== null) {
      answer += ` ${L.typicallyLast(formatDuration(stats.typical_duration_minutes))}`;
    }
    items.push({ question: L.qUsually(name), answer });
  }

  // What is {name}'s stream schedule? — head-on match for the highest-volume
  // query family "[streamer] stream schedule", deliberately distinct from the
  // stats-backed "usually stream" item above: this one is the concrete week
  // (confirmed + predicted slots), that one is the typical pattern. The
  // "next stream" intent stays covered by the "Next up:" sentence.
  if (upcoming.length > 0) {
    const top = upcoming.slice(0, 5);
    const n = upcoming.length;
    // "Sat 21:00 (Just Chatting, predicted)" — streamer-local when tz is set,
    // "Sat 20:00 UTC (…)" otherwise; entries joined with "; " because
    // categories and the predicted marker contain commas.
    const entries = top.map((s) => {
      const label = localizedNextLabel(s.start_time, lang, {
        relative: false,
        timeZone: tz ?? undefined,
      });
      const cat = s.category?.trim();
      const marker = s.is_predicted
        ? cat
          ? `${cat}, ${L.predictedMarker}`
          : L.predictedMarker
        : cat;
      return marker ? `${label} (${marker})` : label;
    });
    let answer = `${L.aScheduleLead(name, n)} ${L.nextUp(entries[0])}`;
    if (entries.length > 1) {
      answer += ` ${L.afterThat(entries.slice(1).join('; '))}`;
    }
    if (n > top.length) {
      answer += ` ${L.plusMore(n - top.length)}`;
    }
    if (tz) {
      answer += ` ${L.allTimesNote(lex.stats.cityTime(timezoneCityLabel(tz)))}`;
    }
    if (top.some((s) => s.is_predicted)) {
      answer += ` ${L.predictedNote}`;
    }
    if (stats?.typical_start && !streamer.is_always_on) {
      answer += ` ${L.outsideDates(
        name,
        stats.typical_start,
        statsTimezoneLabel(stats, ui),
      )}`;
    }
    items.push({ question: L.qSchedule(name), answer });
  }

  // What games does {name} stream?
  const cats = distinctCategories(allSlots, 3);
  if (cats.length > 0) {
    items.push({
      question: L.qGames(name),
      answer:
        cats.length === 1
          ? L.aGamesOne(name, cats[0])
          : L.aGamesMany(name, listConjunction(cats, lang)),
    });
  }

  // How often does {name} stream? — stats-backed when available (stable
  // 28-day frequency, no overlap with the schedule item's 7-day count);
  // falls back to the 7-day slot count for streamers without stats.
  if (streamer.is_always_on) {
    items.push({ question: L.qHowOften(name), answer: L.aAlwaysOn(name, platforms) });
  } else if (stats?.streams_per_week != null) {
    items.push({
      question: L.qHowOften(name),
      answer: L.aPerWeek(name, stats.streams_per_week, stats.window_days),
    });
  } else if (upcoming.length > 0) {
    const days = distinctWeekdayLabels(upcoming, lang, tz);
    items.push({
      question: L.qHowOften(name),
      answer: L.aScheduleCount(
        name,
        upcoming.length,
        days.length > 0 ? listConjunction(days, lang) : null,
      ),
    });
  }

  // Where can I watch {name}? — always available; keeps users on Streamer Times
  // rather than linking out to the platforms.
  items.push({ question: L.qWhere(name), answer: L.aWhere(name, platforms) });

  // What timezone does {name} stream in? — use the city part of the IANA id
  // ("America/New_York" → "New York") for a readable sentence.
  if (streamer.timezone && !streamer.is_always_on) {
    items.push({
      question: L.qTimezone(name),
      answer: L.aTimezone(name, timezoneCityLabel(streamer.timezone)),
    });
  }

  // Are {name}'s stream times predicted or confirmed? — with a pointer to the
  // public methodology page (the label is chrome → viewer locale, D6).
  const predictedCount = upcoming.filter((s) => s.is_predicted).length;
  if (predictedCount > 0) {
    const total = upcoming.length;
    items.push({
      question: L.qPredicted(name),
      answer:
        predictedCount === total
          ? L.aAllPredicted(name)
          : L.aMixed(name, predictedCount, total),
      more: {
        href: localeHref(lang, '/methodology/predictions'),
        label: chromeLexFor(lang).footer.howPredictionsWork,
      },
    });
  }

  return items;
}
