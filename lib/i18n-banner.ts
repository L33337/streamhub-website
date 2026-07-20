import type { UiLang } from './i18n-core';

// --- Language-suggestion banner lexicon (client-safe) ---------------------------
//
// Strings for the banner suggesting the viewer switch to the site version in
// their browser language. Imported from a 'use client' component, so this
// module must stay dependency-free: only the UiLang TYPE import above — never
// lib/seo.ts, lib/i18n-ui.ts or anything else server-only.
//
// Each entry is written IN ITS OWN LANGUAGE: the 'de' strings are shown to a
// user whose browser prefers German while they view a page in some other
// language, so translating them "into the page language" would defeat the
// banner's purpose.

export interface BannerLex {
  /** "This page is also available in {language}." */
  text: string;
  /** Link/button label switching to that language's version. */
  cta: string;
  /** aria-label on the dismiss button. */
  dismiss: string;
}

export const BANNER_STRINGS: Record<UiLang, BannerLex> = {
  en: {
    text: 'This page is also available in English.',
    cta: 'Switch to English',
    dismiss: 'Dismiss',
  },
  de: {
    text: 'Diese Seite gibt es auch auf Deutsch.',
    cta: 'Zur deutschen Version',
    dismiss: 'Ausblenden',
  },
  es: {
    text: 'Esta página también está disponible en español.',
    cta: 'Ver en español',
    dismiss: 'Ocultar',
  },
  fr: {
    text: 'Cette page est aussi disponible en français.',
    cta: 'Voir la version française',
    dismiss: 'Masquer',
  },
  pt: {
    text: 'Esta página também está disponível em português.',
    cta: 'Ver em português',
    dismiss: 'Ocultar',
  },
  it: {
    text: 'Questa pagina è disponibile anche in italiano.',
    cta: 'Vai alla versione italiana',
    dismiss: 'Nascondi',
  },
  ru: {
    text: 'Эта страница доступна и на русском.',
    cta: 'Перейти на русскую версию',
    dismiss: 'Скрыть',
  },
  ja: {
    text: 'このページは日本語でもご覧いただけます。',
    cta: '日本語版を見る',
    dismiss: '閉じる',
  },
  uk: {
    text: 'Ця сторінка доступна й українською.',
    cta: 'Перейти на українську версію',
    dismiss: 'Приховати',
  },
  ar: {
    text: 'هذه الصفحة متوفرة بالعربية أيضًا.',
    cta: 'الانتقال إلى النسخة العربية',
    dismiss: 'إخفاء',
  },
  hu: {
    text: 'Ez az oldal magyarul is elérhető.',
    cta: 'Váltás a magyar verzióra',
    dismiss: 'Elrejtés',
  },
  pl: {
    text: 'Ta strona jest dostępna także po polsku.',
    cta: 'Przejdź do polskiej wersji',
    dismiss: 'Ukryj',
  },
};
