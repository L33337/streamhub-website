import type { Metadata } from 'next';
import type { PublicStreamer, PublicStreamSlot } from '@/lib/server/partner-api';
import { localizedNextLabel } from '@/lib/format/time';

const SITE_URL = 'https://streamertimes.tv';

export function streamerCanonicalUrl(slug: string): string {
  return `${SITE_URL}/streamer/${encodeURIComponent(slug)}`;
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
};

function lexFor(language: string | null): Lex {
  const code = (language || 'en').split('-')[0].toLowerCase();
  return META_STRINGS[code] ?? META_STRINGS.en;
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
  const lang = (streamer.language || 'en').split('-')[0].toLowerCase();
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

  return {
    title: clampTitle(titleCore),
    description: truncate(description, MAX_DESC),
    alternates: { canonical: url },
    openGraph: {
      title: ogTitle,
      description: ogDescription,
      url,
      type: 'profile',
      siteName: 'Streamer Times',
    },
    twitter: {
      card: 'summary_large_image',
      title: twTitle,
      description: twDescription,
    },
  };
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

  return ld;
}

// Cap the number of BroadcastEvents per page. Some streamers have 15+ predicted
// upcoming slots in a 7-day window; emitting all of them risks tripping Google's
// schema-spam quality filter. 10 events ≈ next 3-4 days, plenty for SERP snippets.
const MAX_BROADCAST_EVENTS = 10;

export function buildBroadcastEventsJsonLd(
  streamer: PublicStreamer,
  slots: PublicStreamSlot[],
  slug: string,
): object[] {
  const broadcasterRef = { '@id': personJsonLdId(slug) };
  return slots
    .filter((s) => s.status === 'live' || s.status === 'upcoming')
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
