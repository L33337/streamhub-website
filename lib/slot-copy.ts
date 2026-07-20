// M22 P3 (D5/S3.6): honest reasoning-language fallback for predicted slots.
//
// The copywriter writes `reasoning` in ONE language and persists it as
// `copy_language`; `generic_reasoning` is an always-English template text that
// exists alongside it on M22-era predictions. A viewer whose locale matches
// neither the copy language nor English would otherwise read e.g. Japanese
// reasoning under German chrome — in that case we show the English generic
// text, visibly labelled (SlotLex.autoSummary).
//
// Client-safe: no heavy imports (SlotCard renders server-side today, but the
// helper must stay importable from client components like the feed).
import { resolveUiLang } from '@/lib/i18n-core';

export interface SlotCopyFields {
  reasoning?: string | null;
  generic_reasoning?: string | null;
  copy_language?: string | null;
}

export interface PickedReasoning {
  text: string;
  /** True when the English template fallback replaced foreign-language copy. */
  isGeneric: boolean;
  /** ISO-639-1 language of `text`; '' when unknown (pre-M22 slots). */
  lang: string;
}

/**
 * Best reasoning text for a viewer language.
 * - copy in the viewer's language, or in English (the lingua-franca default
 *   every locale accepts), or of unknown age → the real reasoning.
 * - copy in a third language AND a generic English summary available → the
 *   generic summary (isGeneric=true; render it labelled).
 */
export function pickReasoning(
  slot: SlotCopyFields,
  viewerLanguage: string | null | undefined,
): PickedReasoning | null {
  const viewer = resolveUiLang(viewerLanguage ?? 'en');
  const reasoning = slot.reasoning?.trim() || null;
  const generic = slot.generic_reasoning?.trim() || null;
  const copyLang = slot.copy_language || null;

  if (reasoning) {
    const foreign = !!copyLang && copyLang !== viewer && copyLang !== 'en';
    if (foreign && generic) return { text: generic, isGeneric: true, lang: 'en' };
    return { text: reasoning, isGeneric: false, lang: copyLang ?? '' };
  }
  if (generic) return { text: generic, isGeneric: true, lang: 'en' };
  return null;
}
