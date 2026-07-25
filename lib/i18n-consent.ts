import type { UiLang } from './i18n-core';

// --- Cookie-consent banner lexicon (client-safe) --------------------------------
//
// Strings for the GDPR/TTDSG consent banner. Imported from a 'use client'
// component, so this module must stay dependency-free: only the UiLang TYPE
// import above — never lib/seo.ts, lib/i18n-ui.ts or anything server-only.
//
// Each entry is written IN THE PAGE'S language (the viewer locale), matching
// the rest of the chrome. Brand names (Streamer Times) stay untranslated.
// Register: informal streaming tone, du-form in German. Non-English strings
// are AI-authored (no native review yet — accepted risk, same as i18n-chrome).
//
// Legal note: "accept" and "reject" MUST stay visually equal in the component
// (German DSK / ePrivacy require a reject that is as easy as accept), so the
// lexicon exposes them as peers with no emphasis hint.

export interface ConsentLex {
  /** One-sentence explanation of what the cookies are for. */
  message: string;
  /** Grant button label. */
  accept: string;
  /** Deny button label — kept as prominent as `accept` in the UI. */
  reject: string;
  /** Inline link label to the privacy policy. */
  learnMore: string;
  /** Footer link that reopens the banner to change the choice. */
  manage: string;
  /** aria-label on the banner region. */
  aria: string;
}

export const CONSENT_STRINGS: Record<UiLang, ConsentLex> = {
  en: {
    message:
      'We use cookies only for anonymous analytics to improve Streamer Times.',
    accept: 'Accept',
    reject: 'Reject',
    learnMore: 'Privacy Policy',
    manage: 'Cookie settings',
    aria: 'Cookie consent',
  },
  de: {
    message:
      'Wir nutzen Cookies nur für anonyme Statistiken, um Streamer Times zu verbessern.',
    accept: 'Akzeptieren',
    reject: 'Ablehnen',
    learnMore: 'Datenschutz',
    manage: 'Cookie-Einstellungen',
    aria: 'Cookie-Einwilligung',
  },
  es: {
    message:
      'Usamos cookies solo para estadísticas anónimas y mejorar Streamer Times.',
    accept: 'Aceptar',
    reject: 'Rechazar',
    learnMore: 'Privacidad',
    manage: 'Configuración de cookies',
    aria: 'Consentimiento de cookies',
  },
  fr: {
    message:
      'Nous utilisons des cookies uniquement pour des statistiques anonymes afin d’améliorer Streamer Times.',
    accept: 'Accepter',
    reject: 'Refuser',
    learnMore: 'Confidentialité',
    manage: 'Paramètres des cookies',
    aria: 'Consentement aux cookies',
  },
  pt: {
    message:
      'Usamos cookies apenas para estatísticas anônimas e melhorar o Streamer Times.',
    accept: 'Aceitar',
    reject: 'Recusar',
    learnMore: 'Privacidade',
    manage: 'Configurações de cookies',
    aria: 'Consentimento de cookies',
  },
  it: {
    message:
      'Usiamo i cookie solo per statistiche anonime e per migliorare Streamer Times.',
    accept: 'Accetta',
    reject: 'Rifiuta',
    learnMore: 'Privacy',
    manage: 'Impostazioni cookie',
    aria: 'Consenso ai cookie',
  },
  ru: {
    message:
      'Мы используем файлы cookie только для анонимной статистики, чтобы улучшать Streamer Times.',
    accept: 'Принять',
    reject: 'Отклонить',
    learnMore: 'Конфиденциальность',
    manage: 'Настройки cookie',
    aria: 'Согласие на использование cookie',
  },
  ja: {
    message:
      'Streamer Times を改善するため、匿名の分析にのみ Cookie を使用します。',
    accept: '同意する',
    reject: '拒否する',
    learnMore: 'プライバシーポリシー',
    manage: 'Cookie 設定',
    aria: 'Cookie の同意',
  },
  uk: {
    message:
      'Ми використовуємо файли cookie лише для анонімної статистики, щоб покращувати Streamer Times.',
    accept: 'Прийняти',
    reject: 'Відхилити',
    learnMore: 'Конфіденційність',
    manage: 'Налаштування cookie',
    aria: 'Згода на використання cookie',
  },
  ar: {
    message:
      'نستخدم ملفات تعريف الارتباط للإحصاءات المجهولة فقط لتحسين Streamer Times.',
    accept: 'قبول',
    reject: 'رفض',
    learnMore: 'الخصوصية',
    manage: 'إعدادات ملفات تعريف الارتباط',
    aria: 'الموافقة على ملفات تعريف الارتباط',
  },
  hu: {
    message:
      'Cookie-kat kizárólag névtelen statisztikához használunk, hogy javítsuk a Streamer Times-t.',
    accept: 'Elfogadom',
    reject: 'Elutasítom',
    learnMore: 'Adatvédelem',
    manage: 'Cookie-beállítások',
    aria: 'Cookie-hozzájárulás',
  },
  pl: {
    message:
      'Używamy plików cookie wyłącznie do anonimowych statystyk, aby ulepszać Streamer Times.',
    accept: 'Akceptuję',
    reject: 'Odrzucam',
    learnMore: 'Prywatność',
    manage: 'Ustawienia cookie',
    aria: 'Zgoda na pliki cookie',
  },
};
