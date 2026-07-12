import { resolveUiLang, type UiLang } from './i18n-core';
import type { UiLex } from './i18n/types';
import { en } from './i18n/ui/en';
import { de } from './i18n/ui/de';
import { es } from './i18n/ui/es';
import { fr } from './i18n/ui/fr';
import { pt } from './i18n/ui/pt';
import { it } from './i18n/ui/it';
import { ru } from './i18n/ui/ru';
import { ja } from './i18n/ui/ja';
import { uk } from './i18n/ui/uk';
import { ar } from './i18n/ui/ar';
import { hu } from './i18n/ui/hu';
import { pl } from './i18n/ui/pl';

// --- Streamer-page UI lexicon (server-only) -------------------------------------
//
// The big per-language string table for the streamer detail page body (FAQ,
// stats, headings, empty state, hero chrome). SERVER COMPONENTS ONLY — the
// client-shared strings (SlotCard/status/badges/FavoriteButton) live in the
// deliberately small lib/i18n-slot.ts so this module never ends up in the
// client bundles of /, /live or the feed. Don't import this from anything
// marked 'use client' or rendered inside a client component.
//
// `Record<UiLang, UiLex>` makes completeness a compile-time property: adding a
// language to UI_LANGS or a key to UiLex fails the build until every lexicon
// is complete. Register/authoring rules live in lib/i18n-slot.ts and
// lib/i18n/types.ts.

export type { UiLex } from './i18n/types';

export const UI_STRINGS: Record<UiLang, UiLex> = {
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

/** UI lexicon for a stored broadcaster language; unknown/null → English. */
export function uiLexFor(language: string | null | undefined): UiLex {
  return UI_STRINGS[resolveUiLang(language)];
}
