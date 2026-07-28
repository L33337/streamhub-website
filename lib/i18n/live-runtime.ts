// --- Runtime line of a live card ("~2 h left") --------------------------------
//
// CLIENT-SAFE by design, unlike lib/i18n-hub.ts: HomeLiveRailFilters re-renders
// these labels every minute from the same pure formatter the server used, so an
// open tab never drifts out of date. That means shipping the table to the
// browser — hence its own tiny module (four short entries per language, ~2 KB)
// instead of pulling the whole hub lexicon into the client bundle.
//
// Register follows lib/i18n/hub/*.ts: informal streaming tone, pt = pt-BR.
// Units are abbreviated because the line sits in a dense card meta row.

import type { UiLang } from '@/lib/i18n-core';

export interface LiveRuntimeLex {
  /** Estimate still ahead, e.g. "~2 h 15 min left". Never called with 0/0. */
  remaining(hours: number, minutes: number): string;
  /** Estimate lapsed — no number, because we no longer have an honest one. */
  overrun: string;
  /** No estimate at all; state the elapsed time instead. */
  elapsed(hours: number, minutes: number): string;
  /** `title` on the line: explains the tilde. Never the only carrier of info. */
  estimateNote: string;
}

/** "2 h 15 min" / "45 min" / "3 h" from pre-rounded parts. */
function span(hours: number, minutes: number, h: string, m: string): string {
  if (hours > 0 && minutes > 0) return `${hours} ${h} ${minutes} ${m}`;
  if (hours > 0) return `${hours} ${h}`;
  return `${minutes} ${m}`;
}

export const LIVE_RUNTIME_STRINGS: Record<UiLang, LiveRuntimeLex> = {
  en: {
    remaining: (h, m) => `~${span(h, m, 'h', 'min')} left`,
    overrun: 'Longer than expected',
    elapsed: (h, m) => `Live for ${span(h, m, 'h', 'min')}`,
    estimateNote: "Estimated from this streamer's usual session length",
  },
  de: {
    remaining: (h, m) => `noch ~${span(h, m, 'Std.', 'Min.')}`,
    overrun: 'Länger als erwartet',
    elapsed: (h, m) => `Seit ${span(h, m, 'Std.', 'Min.')} live`,
    estimateNote: 'Geschätzt anhand der üblichen Streamlänge',
  },
  es: {
    remaining: (h, m) => `quedan ~${span(h, m, 'h', 'min')}`,
    overrun: 'Más de lo previsto',
    elapsed: (h, m) => `En directo desde hace ${span(h, m, 'h', 'min')}`,
    estimateNote: 'Estimado a partir de la duración habitual del directo',
  },
  fr: {
    remaining: (h, m) => `encore ~${span(h, m, 'h', 'min')}`,
    overrun: 'Plus long que prévu',
    elapsed: (h, m) => `En live depuis ${span(h, m, 'h', 'min')}`,
    estimateNote: 'Estimé à partir de la durée habituelle des lives',
  },
  pt: {
    remaining: (h, m) => `faltam ~${span(h, m, 'h', 'min')}`,
    overrun: 'Mais do que o previsto',
    elapsed: (h, m) => `Ao vivo há ${span(h, m, 'h', 'min')}`,
    estimateNote: 'Estimado pela duração habitual das lives',
  },
  it: {
    remaining: (h, m) => `ancora ~${span(h, m, 'h', 'min')}`,
    overrun: 'Più del previsto',
    elapsed: (h, m) => `Live da ${span(h, m, 'h', 'min')}`,
    estimateNote: 'Stimato sulla durata abituale delle live',
  },
  ru: {
    remaining: (h, m) => `ещё ~${span(h, m, 'ч', 'мин')}`,
    overrun: 'Дольше ожидаемого',
    elapsed: (h, m) => `В эфире уже ${span(h, m, 'ч', 'мин')}`,
    estimateNote: 'Оценка по обычной длительности стримов',
  },
  ja: {
    remaining: (h, m) =>
      h > 0 && m > 0
        ? `あと約${h}時間${m}分`
        : h > 0
          ? `あと約${h}時間`
          : `あと約${m}分`,
    overrun: '予想より長め',
    elapsed: (h, m) =>
      h > 0 && m > 0
        ? `配信開始から${h}時間${m}分`
        : h > 0
          ? `配信開始から${h}時間`
          : `配信開始から${m}分`,
    estimateNote: '普段の配信時間からの推定',
  },
  uk: {
    remaining: (h, m) => `ще ~${span(h, m, 'год', 'хв')}`,
    overrun: 'Довше очікуваного',
    elapsed: (h, m) => `В ефірі вже ${span(h, m, 'год', 'хв')}`,
    estimateNote: 'Оцінка за звичайною тривалістю стрімів',
  },
  ar: {
    remaining: (h, m) => `يتبقّى ~${span(h, m, 'س', 'د')}`,
    overrun: 'أطول من المتوقع',
    elapsed: (h, m) => `مباشر منذ ${span(h, m, 'س', 'د')}`,
    estimateNote: 'تقدير بناءً على مدة البث المعتادة',
  },
  hu: {
    remaining: (h, m) => `még kb. ${span(h, m, 'ó', 'p')}`,
    overrun: 'A vártnál tovább',
    elapsed: (h, m) => `${span(h, m, 'ó', 'p')} óta élőben`,
    estimateNote: 'A szokásos adáshossz alapján becsülve',
  },
  pl: {
    remaining: (h, m) => `jeszcze ~${span(h, m, 'godz.', 'min')}`,
    overrun: 'Dłużej niż przewidywano',
    elapsed: (h, m) => `Na żywo od ${span(h, m, 'godz.', 'min')}`,
    estimateNote: 'Szacowane na podstawie zwykłej długości transmisji',
  },
};

export function liveRuntimeLexFor(locale: UiLang): LiveRuntimeLex {
  return LIVE_RUNTIME_STRINGS[locale] ?? LIVE_RUNTIME_STRINGS.en;
}
