import { resolveUiLang, type UiLang } from './i18n-core';
import type { HubLex } from './i18n/hub/types';
import { en } from './i18n/hub/en';
import { de } from './i18n/hub/de';
import { es } from './i18n/hub/es';
import { fr } from './i18n/hub/fr';
import { pt } from './i18n/hub/pt';
import { it } from './i18n/hub/it';
import { ru } from './i18n/hub/ru';
import { ja } from './i18n/hub/ja';
import { uk } from './i18n/hub/uk';
import { ar } from './i18n/hub/ar';
import { hu } from './i18n/hub/hu';
import { pl } from './i18n/hub/pl';

// --- Hub-pages UI lexicon (server-only) -----------------------------------------
//
// The per-language string tables for the five indexable hub-page bodies
// (M22 P3): home /, /live, /streamers, /games and /rankings. SERVER
// COMPONENTS ONLY — the client-shared strings (SlotCard/status/badges) live in
// the deliberately small lib/i18n-slot.ts so this module never ends up in the
// client bundles of /, /live or the feed. Don't import this from anything
// marked 'use client' or rendered inside a client component — resolve the
// strings in the server parent and pass them down as props instead.
//
// `Record<UiLang, HubLex>` makes completeness a compile-time property: adding
// a language to UI_LANGS or a key to HubLex fails the build until every
// lexicon is complete. Register/authoring rules live in lib/i18n-slot.ts and
// lib/i18n/hub/types.ts.

export type { HubLex, HubRankingMetric } from './i18n/hub/types';

export const HUB_STRINGS: Record<UiLang, HubLex> = {
  en,
  de,
  es,
  fr,
  pt,
  it,
  ru,
  ja,
  uk,
  ar,
  hu,
  pl,
};

/** Hub lexicon for a viewer locale; unknown/null → English. */
export function hubLexFor(locale: string | null | undefined): HubLex {
  return HUB_STRINGS[resolveUiLang(locale)];
}

/** Inputs for the localized root-/games FAQ (mirrors buildGamesHubFaq for the
 *  'streamers' sort mode — see lib/games-hub.ts). */
export interface RootGamesFaqInput {
  gameCount: number;
  liveStreamerCount: number;
  liveGameCount: number;
  /** #1 / #2 of the view's own ordering; null when the catalog is empty. */
  top: { category: string; count: number } | null;
  second: { category: string; count: number } | null;
}

/**
 * Localized counterpart of buildGamesHubFaq() for the ROOT /games view: the
 * emission conditions are mirrored 1:1 (never a Q&A that answers itself with a
 * zero or an empty name) while the copy comes from the lexicon. English pages
 * keep using buildGamesHubFaq() directly, so this never has to reproduce the
 * EN byte shape.
 */
export function buildRootGamesFaq(
  L: HubLex,
  input: RootGamesFaqInput,
): { q: string; a: string }[] {
  const faq: { q: string; a: string }[] = [];
  if (input.top && input.top.count > 0) {
    faq.push({
      q: L.gamesRoot.faqPopularQ,
      a: L.gamesRoot.faqPopularA(input.top, input.second),
    });
  }
  if (input.liveStreamerCount > 0) {
    faq.push({
      q: L.gamesRoot.faqWhoQ,
      a: L.gamesRoot.faqWhoA(input.liveStreamerCount, input.liveGameCount),
    });
  }
  faq.push({ q: L.gamesRoot.faqRankedQ, a: L.gamesRoot.faqRankedA(input.gameCount) });
  faq.push({ q: L.gamesRoot.faqHoursQ, a: L.gamesRoot.faqHoursA });
  return faq;
}
