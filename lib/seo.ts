import type { Metadata } from 'next';
import type { PublicStreamer, PublicStreamSlot } from '@/lib/server/partner-api';
import { localizedNextLabel } from '@/lib/format/time';

const SITE_URL = 'https://streamertimes.tv';

export function streamerCanonicalUrl(slug: string): string {
  return `${SITE_URL}/streamer/${encodeURIComponent(slug)}`;
}

/**
 * True when a streamer id makes a sane public slug: non-empty and starting
 * with an alphanumeric character. Legacy id-minting produced '' and
 * '-389031'-style ids for non-Latin display names; those rows keep their ids
 * (renames would break FKs + URLs) but their pages are noindexed and excluded
 * from the sitemap. Mid-string hyphens (collision suffixes like
 * 'illojuan-075649') are fine. Case-insensitive because suffixes derived from
 * YouTube channel ids ('-OPjYcQ') contain uppercase.
 */
export function isIndexableStreamerSlug(id: string): boolean {
  return /^[a-z0-9]/i.test(id);
}

/**
 * Later of two ISO timestamps as a Date; ignores null/unparseable inputs.
 * The honest "content changed" signal for a streamer page: updated_at only
 * moves on metadata writes, last_status_change_at on live↔offline flips —
 * both the sitemap <lastmod> and the ProfilePage dateModified take the max.
 */
export function latestChange(updatedAt: string, lastStatusChangeAt: string | null): Date {
  const a = Date.parse(updatedAt);
  const b = lastStatusChangeAt ? Date.parse(lastStatusChangeAt) : NaN;
  const max = Math.max(Number.isNaN(a) ? 0 : a, Number.isNaN(b) ? 0 : b);
  return new Date(max || (Number.isNaN(a) ? Date.now() : a));
}

/** ISO-639-1 language prefix, lowercased. 'de-AT' → 'de', null/empty → 'en'. */
export function langCode(language: string | null | undefined): string {
  return (language || 'en').split('-')[0].toLowerCase();
}

// POSIX locale (underscore form) for og:locale. We only store ISO-639-1 codes,
// so each language maps to one sensible default region. Must match /^[a-z]{2}_[A-Z]{2}$/
// — Facebook/LinkedIn ignore the hyphen (BCP-47) form.
const LANGUAGE_TO_LOCALE: Record<string, string> = {
  en: 'en_US',
  de: 'de_DE',
  es: 'es_ES',
  fr: 'fr_FR',
  pt: 'pt_BR',
  it: 'it_IT',
  ru: 'ru_RU',
  ja: 'ja_JP',
  uk: 'uk_UA',
  ar: 'ar_SA',
  hu: 'hu_HU',
  pl: 'pl_PL',
};

/** OpenGraph og:locale for a streamer language (e.g. 'de_DE'); defaults to 'en_US'. */
export function langToLocale(language: string | null | undefined): string {
  return LANGUAGE_TO_LOCALE[langCode(language)] ?? 'en_US';
}

// Right-to-left scripts. Used to set `dir` on elements that hold native-language
// text (e.g. an Arabic streamer bio), so the browser renders it correctly without
// flipping the surrounding English UI chrome.
const RTL_LANGS = new Set(['ar', 'he', 'fa', 'ur']);

/** Text direction for a native-language text element: 'rtl' or undefined (LTR). */
export function dirFor(language: string | null | undefined): 'rtl' | undefined {
  return RTL_LANGS.has(langCode(language)) ? 'rtl' : undefined;
}

/**
 * BreadcrumbList JSON-LD. Pass crumbs in order from root to current page.
 * The final crumb (current page) omits `url` per Google's guidance — the
 * trailing item should not link to itself.
 */
export function buildBreadcrumbJsonLd(
  items: { name: string; url?: string }[],
): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => {
      const element: Record<string, unknown> = {
        '@type': 'ListItem',
        position: i + 1,
        name: item.name,
      };
      if (item.url) element.item = item.url;
      return element;
    }),
  };
}

// --- SEO meta text generation -------------------------------------------------
//
// Streamer pages render dynamic, language-localised <title>/<meta description>
// driven by the streamer's live status, current game, and next (often AI-
// predicted) stream. Google shows the title as the blue link and the
// description as the grey snippet, so we front-load the unique data and keep
// within Google's truncation limits.

const BRAND_SUFFIX = ' | StreamerTimes';
const MAX_TITLE = 60; // Google truncates SERP titles around here
const MAX_DESC = 155; // and descriptions around here
const MAX_STREAM_TITLE = 70; // budget for the (often long) embedded stream title

/** Truncate on a word boundary and append an ellipsis, trimming trailing punctuation. */
function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  const base = lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut;
  return base.replace(/[\s.,;:!?'"„“”«»-]+$/u, '') + '…';
}

/**
 * Append the brand suffix only if the result still fits Google's title limit;
 * otherwise drop the suffix, and as a last resort hard-truncate an oversized
 * core (only realistic for absurdly long name+category combinations).
 */
function clampTitle(core: string): string {
  if ((core + BRAND_SUFFIX).length <= MAX_TITLE) return core + BRAND_SUFFIX;
  if (core.length <= MAX_TITLE) return core;
  return truncate(core, MAX_TITLE);
}

/**
 * Per-language lexicon. The null-handling structure (missing game/title) is
 * identical across languages, so it lives in the shared assemblers below — each
 * locale only supplies the words. `q` is the [open, close] quote pair.
 */
interface Lex {
  q: [string, string];
  liveTitle(name: string, cat: string | null): string;
  nextTitle(name: string): string;
  fallbackTitle(name: string): string;
  liveBase(name: string): string;
  livePlaying(name: string, cat: string): string;
  nextLead(name: string, label: string, predicted: boolean): string;
  fallbackDesc(name: string, platforms: string): string;
  ogTitle(name: string, cat: string | null, live: boolean): string;
  ogDesc(name: string, platforms: string, cat: string | null, live: boolean): string;
  twDesc(name: string, cat: string | null, live: boolean): string;
}

const META_STRINGS: Record<string, Lex> = {
  en: {
    q: ['“', '”'],
    liveTitle: (n, c) => (c ? `LIVE NOW: ${n} — ${c}` : `LIVE NOW: ${n} is streaming`),
    nextTitle: (n) => `${n} Stream Schedule — Next Stream & Live Status`,
    fallbackTitle: (n) => `${n} — Stream Schedule & Live Status`,
    liveBase: (n) => `${n} is live now`,
    livePlaying: (n, c) => `${n} is live now playing ${c}`,
    nextLead: (n, l, p) => `${n}'s next ${p ? 'predicted ' : ''}stream ${l}`,
    fallbackDesc: (n, p) =>
      `When does ${n} stream live on ${p}? Upcoming schedule, AI-predicted next streams, and current live status.`,
    ogTitle: (n, c, live) =>
      live ? (c ? `LIVE NOW: ${n} — ${c}` : `LIVE NOW: ${n}`) : `${n} — Live Stream Guide`,
    ogDesc: (n, p, c, live) =>
      live
        ? c
          ? `${n} is live now playing ${c}.`
          : `${n} is live now.`
        : `Stream schedule & live status for ${n} on ${p}.`,
    twDesc: (n, c, live) =>
      live ? (c ? `${n} is live now — ${c}.` : `${n} is live now.`) : `Stream schedule for ${n}.`,
  },
  de: {
    q: ['„', '“'],
    liveTitle: (n, c) => (c ? `JETZT LIVE: ${n} — ${c}` : `JETZT LIVE: ${n} streamt`),
    nextTitle: (n) => `${n} Stream-Zeiten — Nächster Stream & Live-Status`,
    fallbackTitle: (n) => `${n} — Stream-Zeiten & Live-Status`,
    liveBase: (n) => `${n} ist gerade live`,
    livePlaying: (n, c) => `${n} streamt gerade ${c}`,
    // "von {name}" phrasing avoids the awkward genitive-s for names ending in s/x/z.
    nextLead: (n, l, p) =>
      p ? `Voraussichtlich nächster Stream von ${n} ${l}` : `Nächster Stream von ${n} ${l}`,
    fallbackDesc: (n, p) =>
      `Wann streamt ${n} live auf ${p}? Sendezeiten, KI-prognostizierte Streams und aktueller Live-Status.`,
    ogTitle: (n, c, live) =>
      live ? (c ? `JETZT LIVE: ${n} — ${c}` : `JETZT LIVE: ${n}`) : `${n} — Live-Stream-Guide`,
    ogDesc: (n, p, c, live) =>
      live
        ? c
          ? `${n} streamt gerade ${c}.`
          : `${n} ist gerade live.`
        : `Sendezeiten & Live-Status für ${n} auf ${p}.`,
    twDesc: (n, c, live) =>
      live ? (c ? `${n} ist live — ${c}.` : `${n} ist gerade live.`) : `Sendezeiten für ${n}.`,
  },
  es: {
    q: ['«', '»'],
    liveTitle: (n, c) => (c ? `EN VIVO: ${n} — ${c}` : `EN VIVO: ${n} está en directo`),
    nextTitle: (n) => `${n} Horario de streams — Próximo directo y estado`,
    fallbackTitle: (n) => `${n} — Horario de streams y estado en vivo`,
    liveBase: (n) => `${n} está en directo`,
    livePlaying: (n, c) => `${n} está en directo jugando a ${c}`,
    nextLead: (n, l, p) =>
      p ? `Próximo directo previsto de ${n} ${l}` : `Próximo directo de ${n} ${l}`,
    fallbackDesc: (n, p) =>
      `¿Cuándo transmite ${n} en directo en ${p}? Horario, próximos streams con predicción IA y estado en vivo.`,
    ogTitle: (n, c, live) =>
      live ? (c ? `EN VIVO: ${n} — ${c}` : `EN VIVO: ${n}`) : `${n} — Guía de streams`,
    ogDesc: (n, p, c, live) =>
      live
        ? c
          ? `${n} está en directo jugando a ${c}.`
          : `${n} está en directo.`
        : `Horario y estado en vivo de ${n} en ${p}.`,
    twDesc: (n, c, live) =>
      live ? (c ? `${n} en directo — ${c}.` : `${n} está en directo.`) : `Horario de streams de ${n}.`,
  },
  fr: {
    q: ['« ', ' »'],
    liveTitle: (n, c) => (c ? `EN DIRECT : ${n} — ${c}` : `EN DIRECT : ${n} est en live`),
    nextTitle: (n) => `${n} programme des streams — Prochain live & statut`,
    fallbackTitle: (n) => `${n} — Programme des streams & statut en direct`,
    liveBase: (n) => `${n} est en live`,
    livePlaying: (n, c) => `${n} est en live et joue à ${c}`,
    nextLead: (n, l, p) => (p ? `Prochain live prévu de ${n} ${l}` : `Prochain live de ${n} ${l}`),
    fallbackDesc: (n, p) =>
      `Quand ${n} streame-t-il en direct sur ${p} ? Programme, prochains streams prédits par IA et statut en direct.`,
    ogTitle: (n, c, live) =>
      live ? (c ? `EN DIRECT : ${n} — ${c}` : `EN DIRECT : ${n}`) : `${n} — Guide des streams`,
    ogDesc: (n, p, c, live) =>
      live
        ? c
          ? `${n} est en live et joue à ${c}.`
          : `${n} est en live.`
        : `Programme et statut en direct de ${n} sur ${p}.`,
    twDesc: (n, c, live) =>
      live ? (c ? `${n} en live — ${c}.` : `${n} est en live.`) : `Programme des streams de ${n}.`,
  },
  pt: {
    q: ['«', '»'],
    liveTitle: (n, c) => (c ? `AO VIVO: ${n} — ${c}` : `AO VIVO: ${n} está transmitindo`),
    nextTitle: (n) => `${n} Agenda de streams — Próxima live e status`,
    fallbackTitle: (n) => `${n} — Agenda de streams e status ao vivo`,
    liveBase: (n) => `${n} está ao vivo`,
    livePlaying: (n, c) => `${n} está ao vivo jogando ${c}`,
    nextLead: (n, l, p) => (p ? `Próxima live prevista de ${n} ${l}` : `Próxima live de ${n} ${l}`),
    fallbackDesc: (n, p) =>
      `Quando ${n} faz live em ${p}? Agenda, próximas lives previstas por IA e status ao vivo.`,
    ogTitle: (n, c, live) =>
      live ? (c ? `AO VIVO: ${n} — ${c}` : `AO VIVO: ${n}`) : `${n} — Guia de streams`,
    ogDesc: (n, p, c, live) =>
      live
        ? c
          ? `${n} está ao vivo jogando ${c}.`
          : `${n} está ao vivo.`
        : `Agenda e status ao vivo de ${n} em ${p}.`,
    twDesc: (n, c, live) =>
      live ? (c ? `${n} ao vivo — ${c}.` : `${n} está ao vivo.`) : `Agenda de streams de ${n}.`,
  },
  it: {
    q: ['«', '»'],
    liveTitle: (n, c) => (c ? `ORA IN DIRETTA: ${n} — ${c}` : `ORA IN DIRETTA: ${n} è in live`),
    nextTitle: (n) => `${n} Calendario stream — Prossima diretta e stato`,
    fallbackTitle: (n) => `${n} — Calendario stream e stato live`,
    liveBase: (n) => `${n} è in diretta`,
    livePlaying: (n, c) => `${n} è in diretta e gioca a ${c}`,
    nextLead: (n, l, p) =>
      p ? `Prossima diretta prevista di ${n} ${l}` : `Prossima diretta di ${n} ${l}`,
    fallbackDesc: (n, p) =>
      `Quando ${n} è in diretta su ${p}? Calendario, prossimi stream previsti con IA e stato live.`,
    ogTitle: (n, c, live) =>
      live ? (c ? `ORA IN DIRETTA: ${n} — ${c}` : `ORA IN DIRETTA: ${n}`) : `${n} — Guida agli stream`,
    ogDesc: (n, p, c, live) =>
      live
        ? c
          ? `${n} è in diretta e gioca a ${c}.`
          : `${n} è in diretta.`
        : `Calendario e stato live di ${n} su ${p}.`,
    twDesc: (n, c, live) =>
      live ? (c ? `${n} in diretta — ${c}.` : `${n} è in diretta.`) : `Calendario stream di ${n}.`,
  },
  // ru/ja/uk/ar/hu/pl strings are AI-authored and were re-reviewed alongside the
  // body-localization lexica (2026-07, adversarial AI pass). A native-speaker
  // review remains an open backlog item — accepted risk per product decision.
  ru: {
    q: ['«', '»'],
    liveTitle: (n, c) => (c ? `СЕЙЧАС В ЭФИРЕ: ${n} — ${c}` : `СЕЙЧАС В ЭФИРЕ: ${n} стримит`),
    nextTitle: (n) => `${n} — расписание стримов — Следующий стрим и статус эфира`,
    fallbackTitle: (n) => `${n} — расписание стримов и статус эфира`,
    liveBase: (n) => `${n} сейчас в эфире`,
    livePlaying: (n, c) => `${n} сейчас в эфире — играет в ${c}`,
    nextLead: (n, l, p) =>
      p ? `Предполагаемый следующий стрим ${n} ${l}` : `Следующий стрим ${n} ${l}`,
    fallbackDesc: (n, p) =>
      `Когда ${n} выходит в эфир на ${p}? Расписание, прогноз следующих стримов на основе ИИ и текущий статус эфира.`,
    ogTitle: (n, c, live) =>
      live ? (c ? `СЕЙЧАС В ЭФИРЕ: ${n} — ${c}` : `СЕЙЧАС В ЭФИРЕ: ${n}`) : `${n} — гид по стримам`,
    ogDesc: (n, p, c, live) =>
      live
        ? c
          ? `${n} сейчас в эфире — играет в ${c}.`
          : `${n} сейчас в эфире.`
        : `Расписание стримов и статус эфира для ${n} на ${p}.`,
    twDesc: (n, c, live) =>
      live ? (c ? `${n} в эфире — ${c}.` : `${n} сейчас в эфире.`) : `Расписание стримов ${n}.`,
  },
  uk: {
    q: ['«', '»'],
    liveTitle: (n, c) => (c ? `ЗАРАЗ У ЕФІРІ: ${n} — ${c}` : `ЗАРАЗ У ЕФІРІ: ${n} стрімить`),
    nextTitle: (n) => `${n} — розклад стрімів — Наступний стрім і статус ефіру`,
    fallbackTitle: (n) => `${n} — розклад стрімів і статус ефіру`,
    liveBase: (n) => `${n} зараз у ефірі`,
    livePlaying: (n, c) => `${n} зараз у ефірі — грає в ${c}`,
    nextLead: (n, l, p) =>
      p ? `Імовірно наступний стрім ${n} ${l}` : `Наступний стрім ${n} ${l}`,
    fallbackDesc: (n, p) =>
      `Коли ${n} виходить у ефір на ${p}? Розклад, прогноз наступних стрімів на основі ШІ та поточний статус ефіру.`,
    ogTitle: (n, c, live) =>
      live ? (c ? `ЗАРАЗ У ЕФІРІ: ${n} — ${c}` : `ЗАРАЗ У ЕФІРІ: ${n}`) : `${n} — гід по стрімах`,
    ogDesc: (n, p, c, live) =>
      live
        ? c
          ? `${n} зараз у ефірі — грає в ${c}.`
          : `${n} зараз у ефірі.`
        : `Розклад стрімів і статус ефіру для ${n} на ${p}.`,
    twDesc: (n, c, live) =>
      live ? (c ? `${n} у ефірі — ${c}.` : `${n} зараз у ефірі.`) : `Розклад стрімів ${n}.`,
  },
  ja: {
    q: ['「', '」'],
    liveTitle: (n, c) => (c ? `配信中: ${n} — ${c}` : `配信中: ${n}`),
    nextTitle: (n) => `${n} の配信スケジュール — 次回配信とライブ状況`,
    fallbackTitle: (n) => `${n} — 配信スケジュールとライブ状況`,
    liveBase: (n) => `${n} は配信中`,
    livePlaying: (n, c) => `${n} は ${c} を配信中`,
    nextLead: (n, l, p) => (p ? `${n} の次回配信予想は ${l}` : `${n} の次回配信は ${l}`),
    fallbackDesc: (n, p) =>
      `${n} が ${p} で配信するのはいつ？ 配信スケジュール、AIによる次回配信予想、現在のライブ状況をチェック。`,
    ogTitle: (n, c, live) =>
      live ? (c ? `配信中: ${n} — ${c}` : `配信中: ${n}`) : `${n} — 配信ガイド`,
    ogDesc: (n, p, c, live) =>
      live
        ? c
          ? `${n} は ${c} を配信中。`
          : `${n} は配信中。`
        : `${p} での ${n} の配信スケジュールとライブ状況。`,
    twDesc: (n, c, live) =>
      live ? (c ? `${n} は配信中 — ${c}。` : `${n} は配信中。`) : `${n} の配信スケジュール。`,
  },
  ar: {
    q: ['«', '»'],
    liveTitle: (n, c) => (c ? `مباشر الآن: ${n} — ${c}` : `مباشر الآن: ${n} يبث`),
    nextTitle: (n) => `${n} — جدول البث — البث القادم وحالة البث`,
    fallbackTitle: (n) => `${n} — جدول البث وحالة البث المباشر`,
    liveBase: (n) => `${n} يبث مباشرة الآن`,
    livePlaying: (n, c) => `${n} يبث الآن ${c}`,
    nextLead: (n, l, p) =>
      p ? `البث القادم المتوقع لـ ${n} ${l}` : `البث القادم لـ ${n} ${l}`,
    fallbackDesc: (n, p) =>
      `متى يبث ${n} مباشرة على ${p}؟ جدول البث، توقعات البث القادم بالذكاء الاصطناعي، وحالة البث الحالية.`,
    ogTitle: (n, c, live) =>
      live ? (c ? `مباشر الآن: ${n} — ${c}` : `مباشر الآن: ${n}`) : `${n} — دليل البث`,
    ogDesc: (n, p, c, live) =>
      live
        ? c
          ? `${n} يبث الآن ${c}.`
          : `${n} يبث مباشرة الآن.`
        : `جدول البث وحالة البث المباشر لـ ${n} على ${p}.`,
    twDesc: (n, c, live) =>
      live ? (c ? `${n} يبث الآن — ${c}.` : `${n} يبث مباشرة الآن.`) : `جدول بث ${n}.`,
  },
  hu: {
    q: ['„', '”'],
    liveTitle: (n, c) => (c ? `ÉLŐ MOST: ${n} — ${c}` : `ÉLŐ MOST: ${n} épp streamel`),
    nextTitle: (n) => `${n} stream-időpontok — Következő stream és élő státusz`,
    fallbackTitle: (n) => `${n} — stream-időpontok és élő státusz`,
    liveBase: (n) => `${n} épp élőben van`,
    livePlaying: (n, c) => `${n} épp élőben — ${c}`,
    nextLead: (n, l, p) =>
      p ? `${n} várható következő streamje ${l}` : `${n} következő streamje ${l}`,
    fallbackDesc: (n, p) =>
      `Mikor streamel ${n} élőben a ${p} platformon? Műsorrend, MI által előrejelzett következő streamek és aktuális élő státusz.`,
    ogTitle: (n, c, live) =>
      live ? (c ? `ÉLŐ MOST: ${n} — ${c}` : `ÉLŐ MOST: ${n}`) : `${n} — stream-útmutató`,
    ogDesc: (n, p, c, live) =>
      live
        ? c
          ? `${n} épp élőben — ${c}.`
          : `${n} épp élőben van.`
        : `${n} stream-időpontjai és élő státusza a ${p} platformon.`,
    twDesc: (n, c, live) =>
      live ? (c ? `${n} élőben — ${c}.` : `${n} épp élőben van.`) : `${n} stream-időpontjai.`,
  },
  pl: {
    q: ['„', '”'],
    liveTitle: (n, c) => (c ? `NA ŻYWO: ${n} — ${c}` : `NA ŻYWO: ${n} streamuje`),
    nextTitle: (n) => `${n} — harmonogram streamów — Następny stream i status na żywo`,
    fallbackTitle: (n) => `${n} — harmonogram streamów i status na żywo`,
    liveBase: (n) => `${n} jest teraz na żywo`,
    livePlaying: (n, c) => `${n} jest teraz na żywo i gra w ${c}`,
    nextLead: (n, l, p) =>
      p ? `Przewidywany następny stream ${n} ${l}` : `Następny stream ${n} ${l}`,
    fallbackDesc: (n, p) =>
      `Kiedy ${n} streamuje na żywo na ${p}? Harmonogram, następne streamy przewidywane przez AI i aktualny status na żywo.`,
    ogTitle: (n, c, live) =>
      live ? (c ? `NA ŻYWO: ${n} — ${c}` : `NA ŻYWO: ${n}`) : `${n} — przewodnik po streamach`,
    ogDesc: (n, p, c, live) =>
      live
        ? c
          ? `${n} jest teraz na żywo i gra w ${c}.`
          : `${n} jest teraz na żywo.`
        : `Harmonogram streamów i status na żywo ${n} na ${p}.`,
    twDesc: (n, c, live) =>
      live ? (c ? `${n} na żywo — ${c}.` : `${n} jest teraz na żywo.`) : `Harmonogram streamów ${n}.`,
  },
};

function lexFor(language: string | null): Lex {
  return META_STRINGS[langCode(language)] ?? META_STRINGS.en;
}

/** "{name} is live now playing {game}: "{title}"." — clauses omitted when data is absent. */
function buildLiveDesc(L: Lex, name: string, cat: string | null, title: string | null): string {
  const lead = cat ? L.livePlaying(name, cat) : L.liveBase(name);
  return title ? `${lead}: ${L.q[0]}${title}${L.q[1]}.` : `${lead}.`;
}

/** "{name}'s next [predicted] stream {when}: "{title}" ({game})." — clauses omitted when absent. */
function buildNextDesc(
  L: Lex,
  name: string,
  label: string,
  cat: string | null,
  title: string | null,
  predicted: boolean,
): string {
  const lead = L.nextLead(name, label, predicted);
  if (title && cat) return `${lead}: ${L.q[0]}${title}${L.q[1]} (${cat}).`;
  if (title) return `${lead}: ${L.q[0]}${title}${L.q[1]}.`;
  if (cat) return `${lead} — ${cat}.`;
  return `${lead}.`;
}

function cleanField(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function buildStreamerMetadata(
  streamer: PublicStreamer,
  slug: string,
  opts?: { liveSlot?: PublicStreamSlot | null; nextSlot?: PublicStreamSlot | null },
): Metadata {
  const platforms =
    streamer.platforms.length > 0
      ? streamer.platforms.map((p) => p[0].toUpperCase() + p.slice(1)).join(' + ')
      : 'Twitch & YouTube';
  const url = streamerCanonicalUrl(slug);
  const L = lexFor(streamer.language);
  const lang = langCode(streamer.language);
  const name = streamer.name;

  const live = opts?.liveSlot ?? null;
  const next = opts?.nextSlot ?? null;

  let titleCore: string;
  let description: string;
  let ogTitle: string;
  let ogDescription: string;
  let twTitle: string;
  let twDescription: string;

  if (live) {
    const cat = cleanField(live.category);
    const st = cleanField(live.title);
    const title = st ? truncate(st, MAX_STREAM_TITLE) : null;
    titleCore = L.liveTitle(name, cat);
    description = buildLiveDesc(L, name, cat, title);
    ogTitle = L.ogTitle(name, cat, true);
    ogDescription = L.ogDesc(name, platforms, cat, true);
    twTitle = ogTitle;
    twDescription = L.twDesc(name, cat, true);
  } else if (next) {
    const cat = cleanField(next.category);
    const st = cleanField(next.title);
    const title = st ? truncate(st, MAX_STREAM_TITLE) : null;
    const label = localizedNextLabel(next.start_time, lang, { relative: false });
    titleCore = L.nextTitle(name);
    description = buildNextDesc(L, name, label, cat, title, !!next.is_predicted);
    ogTitle = L.fallbackTitle(name);
    ogDescription = L.ogDesc(name, platforms, null, false);
    twTitle = ogTitle;
    twDescription = L.twDesc(name, null, false);
  } else {
    titleCore = L.fallbackTitle(name);
    description = L.fallbackDesc(name, platforms);
    ogTitle = L.fallbackTitle(name);
    ogDescription = L.ogDesc(name, platforms, null, false);
    twTitle = ogTitle;
    twDescription = L.twDesc(name, null, false);
  }

  // Index-gate thin streamer pages. A streamer with no live slot, no upcoming/
  // predicted slot, and no editorial feature flag has nothing unique to offer
  // search — the page renders only EmptyScheduleState. Emitting noindex keeps
  // such near-duplicate pages out of Google's index, protecting overall domain
  // quality under the scaled-content / helpful-content signals. It flips back to
  // indexable automatically the moment the streamer is live or has an upcoming
  // stream again. `follow: true` keeps the internal link graph crawlable.
  // Degenerate legacy slugs ('' / leading hyphen) are permanently gated out.
  const indexable =
    (!!live || !!next || streamer.is_featured) && isIndexableStreamerSlug(slug);

  const meta: Metadata = {
    title: clampTitle(titleCore),
    description: truncate(description, MAX_DESC),
    alternates: { canonical: url },
    openGraph: {
      title: ogTitle,
      description: ogDescription,
      url,
      type: 'profile',
      siteName: 'Streamer Times',
      // Honest per-streamer locale (e.g. de_DE). With the lexicon now covering
      // every stored language, the og text and this locale always agree.
      locale: langToLocale(streamer.language),
    },
    twitter: {
      card: 'summary_large_image',
      title: twTitle,
      description: twDescription,
    },
  };

  // Only set `robots` when gating out — leaving it unset lets the page inherit
  // the root `index: true, follow: true` from app/layout.tsx.
  if (!indexable) {
    meta.robots = { index: false, follow: true };
  }

  return meta;
}

/**
 * Stable JSON-LD identifier for the streamer's Person node. Referenced from
 * BroadcastEvent.broadcaster.@id so Google can resolve them as one graph.
 */
function personJsonLdId(slug: string): string {
  return `${streamerCanonicalUrl(slug)}#person`;
}

export function buildPersonJsonLd(streamer: PublicStreamer, slug: string): object {
  const canonicalUrl = streamerCanonicalUrl(slug);
  const ld: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': personJsonLdId(slug),
    name: streamer.name,
    url: canonicalUrl,
  };
  if (streamer.avatar_url) ld.image = streamer.avatar_url;
  if (streamer.description) ld.description = streamer.description;
  // schema.org: `inLanguage` is not valid on Person — use `knowsLanguage`
  // ("a known language for a person"). BCP-47 string is accepted.
  if (streamer.language) ld.knowsLanguage = streamer.language;

  // sameAs: platform identity verification for Google Knowledge Graph
  const sameAs: string[] = [];
  if (streamer.twitch_login) {
    sameAs.push(`https://twitch.tv/${streamer.twitch_login}`);
  }
  if (streamer.youtube_channel_id) {
    sameAs.push(`https://youtube.com/channel/${streamer.youtube_channel_id}`);
  }
  if (sameAs.length > 0) ld.sameAs = sameAs;

  // Follower/subscriber count as an InteractionCounter — a recommended
  // ProfilePage mainEntity property that feeds the "followers" figure in
  // Google's profile rich results. Omitted while the backend hasn't fetched
  // a count (null ≠ zero).
  if (streamer.follower_count != null) {
    ld.interactionStatistic = {
      '@type': 'InteractionCounter',
      interactionType: { '@type': 'FollowAction' },
      userInteractionCount: streamer.follower_count,
    };
  }

  return ld;
}

/**
 * ProfilePage wrapper for the streamer page — the page-level type Google's
 * profile-page rich results expect (the Person alone types the entity, not
 * the page). The Person nests as mainEntity WITHOUT its own @context (one
 * graph per script) but KEEPS its `#person` @id, so the BroadcastEvent
 * scripts' broadcaster references still resolve to it across script blocks.
 */
export function buildProfilePageJsonLd(streamer: PublicStreamer, slug: string): object {
  const person = { ...(buildPersonJsonLd(streamer, slug) as Record<string, unknown>) };
  delete person['@context'];
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    url: streamerCanonicalUrl(slug),
    dateModified: latestChange(streamer.updated_at, streamer.last_status_change_at).toISOString(),
    mainEntity: person,
  };
}

// Cap the number of BroadcastEvents per page. Some streamers have 15+ predicted
// upcoming slots in a 7-day window; emitting all of them risks tripping Google's
// schema-spam quality filter. 10 events ≈ next 3-4 days, plenty for SERP snippets.
const MAX_BROADCAST_EVENTS = 10;

export function buildBroadcastEventsJsonLd(
  streamer: PublicStreamer,
  slots: PublicStreamSlot[],
  slug: string,
  // Slot already represented by the page's VideoObject (its publication nests
  // the BroadcastEvent) — emitting a second, bare event for the same broadcast
  // with a *different* endDate would be contradictory duplicate markup. Only
  // pass this when the VideoObject was actually emitted.
  excludeSlotId?: string,
): object[] {
  const broadcasterRef = { '@id': personJsonLdId(slug) };
  return slots
    .filter((s) => s.status === 'live' || s.status === 'upcoming')
    .filter((s) => s.id !== excludeSlotId)
    .slice(0, MAX_BROADCAST_EVENTS)
    .map((slot) => {
      const start = new Date(slot.start_time);
      const durationMin = slot.duration_minutes > 0 ? slot.duration_minutes : 60;
      const end = new Date(start.getTime() + durationMin * 60_000);
      const event: Record<string, unknown> = {
        '@context': 'https://schema.org',
        '@type': 'BroadcastEvent',
        name: slot.title,
        isLiveBroadcast: true,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        broadcaster: broadcasterRef,
      };
      // inLanguage IS valid on Event/BroadcastEvent. Helps non-English fans find the schedule.
      if (streamer.language) event.inLanguage = streamer.language;
      // Use the AI's reasoning as the event description when available — meaningful
      // SEO copy that explains why this slot was predicted.
      if (slot.reasoning) event.description = slot.reasoning;
      return event;
    });
}

/**
 * VideoObject with a nested `publication: BroadcastEvent` — the exact shape
 * Google requires for the LIVE badge (a bare BroadcastEvent is not enough).
 * Emitted ONLY while the streamer is actually live: a persistent VideoObject
 * on a page without a playable video risks the schema-spam filter.
 *
 * Returns null when the slot isn't live or no thumbnail is available —
 * `thumbnailUrl` is a REQUIRED VideoObject property, so no thumbnail means
 * no VideoObject at all (the caller keeps the bare BroadcastEvent instead).
 *
 * endDate must never be in the past at crawl time while the stream is live
 * (Google won't show the badge otherwise), so it is computed as
 * max(start + duration, now + 1h): every ISR regeneration (revalidate=300)
 * pushes it ≥55 minutes into the future — long streams and always-on
 * channels stay badge-eligible without knowing the real end.
 */
export function buildLiveVideoObjectJsonLd(
  streamer: PublicStreamer,
  slot: PublicStreamSlot,
  slug: string,
  now: Date = new Date(),
): object | null {
  if (slot.status !== 'live') return null;

  const thumbnails = [...new Set([slot.thumbnail_url, slot.avatar_url ?? streamer.avatar_url])]
    .filter((u): u is string => !!u);
  if (thumbnails.length === 0) return null;

  const start = new Date(slot.start_time);
  const durationMin = slot.duration_minutes > 0 ? slot.duration_minutes : 60;
  const approxEnd = new Date(
    Math.max(start.getTime() + durationMin * 60_000, now.getTime() + 60 * 60_000),
  );

  // Language-neutral composition (the page body renders in the streamer's
  // language — English filler text would clash on non-English pages).
  const descriptionParts = [slot.title, slot.category, streamer.name];
  const ld: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: slot.title,
    description: descriptionParts.filter(Boolean).join(' — '),
    thumbnailUrl: thumbnails,
    uploadDate: start.toISOString(),
    publication: {
      '@type': 'BroadcastEvent',
      isLiveBroadcast: true,
      startDate: start.toISOString(),
      endDate: approxEnd.toISOString(),
    },
  };

  // embedUrl must be the player itself, never a watch page (Google guideline).
  // Twitch preferred on multi-platform slots; the `parent` param has to be the
  // production host — JSON-LD renders server-side, so the client-side
  // window.location.hostname trick from LiveEmbedFrame is not available here.
  if (slot.twitch_login) {
    const parent = new URL(SITE_URL).hostname;
    ld.embedUrl =
      `https://player.twitch.tv/?channel=${encodeURIComponent(slot.twitch_login)}` +
      `&parent=${encodeURIComponent(parent)}`;
  } else if (slot.youtube_channel_id) {
    // No video id in the DTO — YouTube's channel-based live embed.
    ld.embedUrl = `https://www.youtube.com/embed/live_stream?channel=${encodeURIComponent(slot.youtube_channel_id)}`;
  }

  if (streamer.language) ld.inLanguage = streamer.language;

  return ld;
}
