import type { ConfidenceLevel } from '@/lib/server/partner-api';
import { pluralForms, resolveUiLang, type UiLang } from './i18n-core';

// --- Slot-level UI lexicon (client-safe) ----------------------------------------
//
// Strings for the components that are SHARED with English pages (SlotCard,
// SlotStatusText, Day nav/sections, FavoriteButton, WatchButtons, badges) and
// therefore end up in the client bundles of /, /live and the feed. Keep this
// module small — the big streamer-page lexicon lives in lib/i18n-ui.ts and must
// never be imported from here (or from anything this file imports).
//
// The 'en' entries are byte-identical to the previously hardcoded strings; the
// shared components default to 'en', so pages that don't pass a language render
// exactly as before.
//
// Translation register (applies to lib/i18n-ui.ts too):
// - Informal streaming tone; German uses du-form, French tu-form, Japanese
//   polite です/ます.
// - Brand names (Twitch, YouTube, Streamer Times), game/category names, "UTC",
//   the visible "LIVE" / "24/7" badge text and "VOD" stay untranslated.
// - No naive English possessives — each language phrases name-references
//   grammatically on its own.
// - All non-English strings are AI-authored (reviewed via an adversarial
//   AI pass 2026-07; no native-speaker review yet — accepted risk).

export interface SlotLex {
  /** "Live since {2 hours}" — duration comes from getRelativeTime(). */
  statusLiveSince(duration: string): string;
  /** "Ends in {~2h}" — approx stays the language-neutral "~2h" form. */
  statusEndsIn(approx: string): string;
  /** "Around {hour}" — hour may carry the "your time" + zone suffix. */
  statusAround(hour: string): string;
  /** "{hour} your time" — viewer-local hour qualifier. */
  statusYourTime(hour: string): string;
  /** "Was expected around {hour}" — predicted start already passed. */
  statusWasExpected(hour: string): string;
  statusOffline: string;
  /** "Confidence:" prefix before the confidence badge. */
  confidencePrefix: string;
  confidenceLabels: Record<ConfidenceLevel, string>;
  confidenceAria(level: ConfidenceLevel): string;
  liveBadgeAria: string;
  /** "3 streams" — languages handle their own plural rules. */
  nStreams(n: number): string;
  jumpToDayAria: string;
  streamsOnAria(label: string): string;
  noStreamsExpected: string;
  favoriteAria(name?: string): string;
  signInToFavoriteAria(name?: string): string;
  saveInAppAria(name?: string): string;
  signInTitle: string;
  saveInAppTitle: string;
  addToFavorites: string;
  removeFromFavorites: string;
  watchOnTwitch: string;
  watchOnYouTube: string;
  /** sr-only external-link hint, including its own leading spacing. */
  opensInNewTab: string;
  /** M22: heading of the prediction-reasoning box in StreamSlotDetail. */
  whyThisPrediction: string;
  /** M22 P3: label shown when the always-English generic_reasoning replaces foreign-language copy. */
  autoSummary: string;
}

const SLOT_STRINGS: Record<UiLang, SlotLex> = {
  en: {
    statusLiveSince: (d) => `Live since ${d}`,
    statusEndsIn: (x) => `Ends in ${x}`,
    statusAround: (h) => `Around ${h}`,
    statusYourTime: (h) => `${h} your time`,
    statusWasExpected: (h) => `Was expected around ${h}`,
    statusOffline: 'Offline',
    confidencePrefix: 'Confidence:',
    confidenceLabels: { high: 'HIGH', medium: 'MEDIUM', low: 'LOW' },
    confidenceAria: (l) => `${l} confidence`,
    liveBadgeAria: 'Currently live',
    nStreams: (n) => `${n} ${n === 1 ? 'stream' : 'streams'}`,
    jumpToDayAria: 'Jump to a day',
    streamsOnAria: (label) => `Streams on ${label}`,
    noStreamsExpected: 'No streams expected',
    favoriteAria: (name) => (name ? `Favorite ${name}` : 'Favorite streamer'),
    signInToFavoriteAria: (name) => `Sign in to favorite ${name ?? 'this streamer'}`,
    saveInAppAria: (name) => `Save ${name ?? 'streamer'} in the app`,
    signInTitle: 'Sign in to save favorites',
    saveInAppTitle: 'Save in the app',
    addToFavorites: 'Add to favorites',
    removeFromFavorites: 'Remove from favorites',
    watchOnTwitch: 'Watch on Twitch',
    watchOnYouTube: 'Watch on YouTube',
    opensInNewTab: ' (opens in new tab)',
    whyThisPrediction: 'Why this prediction?',
    autoSummary: 'Auto summary',
  },
  de: {
    statusLiveSince: (d) => `Live seit ${d}`,
    statusEndsIn: (x) => `Endet in ${x}`,
    statusAround: (h) => `Gegen ${h}`,
    statusYourTime: (h) => `${h} (deine Zeit)`,
    // Prefix form: `h` carries the "· 23:00 CEST" suffix on the client, which
    // would break a verb-final German sentence frame.
    statusWasExpected: (h) => `Erwartet gegen ${h}`,
    statusOffline: 'Offline',
    confidencePrefix: 'Wahrscheinlichkeit:',
    confidenceLabels: { high: 'HOCH', medium: 'MITTEL', low: 'NIEDRIG' },
    confidenceAria: (l) =>
      `Wahrscheinlichkeit ${{ high: 'hoch', medium: 'mittel', low: 'niedrig' }[l]}`,
    liveBadgeAria: 'Gerade live',
    nStreams: (n) => `${n} ${n === 1 ? 'Stream' : 'Streams'}`,
    jumpToDayAria: 'Zu einem Tag springen',
    streamsOnAria: (label) => `Streams: ${label}`,
    noStreamsExpected: 'Keine Streams erwartet',
    favoriteAria: (name) => (name ? `${name} favorisieren` : 'Streamer favorisieren'),
    signInToFavoriteAria: (name) =>
      `Anmelden, um ${name ?? 'diesen Streamer'} zu favorisieren`,
    saveInAppAria: (name) => `${name ?? 'Streamer'} in der App speichern`,
    signInTitle: 'Anmelden, um Favoriten zu speichern',
    saveInAppTitle: 'In der App speichern',
    addToFavorites: 'Zu Favoriten hinzufügen',
    removeFromFavorites: 'Aus Favoriten entfernen',
    watchOnTwitch: 'Auf Twitch ansehen',
    watchOnYouTube: 'Auf YouTube ansehen',
    opensInNewTab: ' (öffnet in neuem Tab)',
    whyThisPrediction: 'Warum diese Vorhersage?',
    autoSummary: 'Automatische Kurzfassung (englisch)',
  },
  es: {
    statusLiveSince: (d) => `En directo desde hace ${d}`,
    statusEndsIn: (x) => `Termina en ${x}`,
    statusAround: (h) => `Sobre las ${h}`,
    statusYourTime: (h) => `${h} (tu hora)`,
    statusWasExpected: (h) => `Se esperaba sobre las ${h}`,
    statusOffline: 'Offline',
    confidencePrefix: 'Probabilidad:',
    confidenceLabels: { high: 'ALTA', medium: 'MEDIA', low: 'BAJA' },
    confidenceAria: (l) =>
      `probabilidad ${{ high: 'alta', medium: 'media', low: 'baja' }[l]}`,
    liveBadgeAria: 'En directo ahora',
    nStreams: (n) => `${n} ${n === 1 ? 'stream' : 'streams'}`,
    jumpToDayAria: 'Ir a un día',
    streamsOnAria: (label) => `Streams: ${label}`,
    noStreamsExpected: 'No se esperan streams',
    favoriteAria: (name) =>
      name ? `Añadir ${name} a favoritos` : 'Añadir streamer a favoritos',
    signInToFavoriteAria: (name) =>
      `Inicia sesión para añadir ${name ?? 'este streamer'} a favoritos`,
    saveInAppAria: (name) => `Guarda a ${name ?? 'este streamer'} en la app`,
    signInTitle: 'Inicia sesión para guardar favoritos',
    saveInAppTitle: 'Guardar en la app',
    addToFavorites: 'Añadir a favoritos',
    removeFromFavorites: 'Quitar de favoritos',
    watchOnTwitch: 'Ver en Twitch',
    watchOnYouTube: 'Ver en YouTube',
    opensInNewTab: ' (se abre en una pestaña nueva)',
    whyThisPrediction: '¿Por qué esta predicción?',
    autoSummary: 'Resumen automático (en inglés)',
  },
  fr: {
    statusLiveSince: (d) => `En live depuis ${d}`,
    statusEndsIn: (x) => `Se termine dans ${x}`,
    statusAround: (h) => `Vers ${h}`,
    statusYourTime: (h) => `${h} (ton heure)`,
    statusWasExpected: (h) => `Était attendu vers ${h}`,
    statusOffline: 'Hors ligne',
    confidencePrefix: 'Probabilité :',
    confidenceLabels: { high: 'ÉLEVÉE', medium: 'MOYENNE', low: 'FAIBLE' },
    confidenceAria: (l) =>
      `probabilité ${{ high: 'élevée', medium: 'moyenne', low: 'faible' }[l]}`,
    liveBadgeAria: 'En direct actuellement',
    nStreams: (n) => `${n} ${n === 1 ? 'stream' : 'streams'}`,
    jumpToDayAria: 'Aller à un jour',
    streamsOnAria: (label) => `Streams : ${label}`,
    noStreamsExpected: 'Aucun stream prévu',
    favoriteAria: (name) =>
      name ? `Ajouter ${name} aux favoris` : 'Ajouter le streamer aux favoris',
    signInToFavoriteAria: (name) =>
      `Connecte-toi pour ajouter ${name ?? 'ce streamer'} aux favoris`,
    saveInAppAria: (name) => `Enregistre ${name ?? 'ce streamer'} dans l'app`,
    signInTitle: 'Connecte-toi pour enregistrer tes favoris',
    saveInAppTitle: `Enregistrer dans l'app`,
    addToFavorites: 'Ajouter aux favoris',
    removeFromFavorites: 'Retirer des favoris',
    watchOnTwitch: 'Regarder sur Twitch',
    watchOnYouTube: 'Regarder sur YouTube',
    opensInNewTab: ` (s'ouvre dans un nouvel onglet)`,
    whyThisPrediction: 'Pourquoi cette prédiction ?',
    autoSummary: 'Résumé automatique (en anglais)',
  },
  pt: {
    statusLiveSince: (d) => `Ao vivo há ${d}`,
    statusEndsIn: (x) => `Termina em ${x}`,
    statusAround: (h) => `Por volta das ${h}`,
    statusYourTime: (h) => `${h} (seu horário)`,
    statusWasExpected: (h) => `Era esperado por volta das ${h}`,
    statusOffline: 'Offline',
    confidencePrefix: 'Probabilidade:',
    confidenceLabels: { high: 'ALTA', medium: 'MÉDIA', low: 'BAIXA' },
    confidenceAria: (l) =>
      `probabilidade ${{ high: 'alta', medium: 'média', low: 'baixa' }[l]}`,
    liveBadgeAria: 'Ao vivo agora',
    nStreams: (n) => `${n} ${n === 1 ? 'stream' : 'streams'}`,
    jumpToDayAria: 'Ir para um dia',
    streamsOnAria: (label) => `Streams: ${label}`,
    noStreamsExpected: 'Nenhum stream previsto',
    favoriteAria: (name) => (name ? `Favoritar ${name}` : 'Favoritar streamer'),
    signInToFavoriteAria: (name) =>
      `Faça login para favoritar ${name ?? 'este streamer'}`,
    saveInAppAria: (name) => `Salve ${name ?? 'o streamer'} no app`,
    signInTitle: 'Faça login para salvar favoritos',
    saveInAppTitle: 'Salvar no app',
    addToFavorites: 'Adicionar aos favoritos',
    removeFromFavorites: 'Remover dos favoritos',
    watchOnTwitch: 'Assistir na Twitch',
    watchOnYouTube: 'Assistir no YouTube',
    opensInNewTab: ' (abre em nova aba)',
    whyThisPrediction: 'Por que esta previsão?',
    autoSummary: 'Resumo automático (em inglês)',
  },
  it: {
    statusLiveSince: (d) => `In diretta da ${d}`,
    statusEndsIn: (x) => `Termina tra ${x}`,
    statusAround: (h) => `Verso le ${h}`,
    statusYourTime: (h) => `${h} (la tua ora)`,
    statusWasExpected: (h) => `Era previsto verso le ${h}`,
    statusOffline: 'Offline',
    confidencePrefix: 'Probabilità:',
    confidenceLabels: { high: 'ALTA', medium: 'MEDIA', low: 'BASSA' },
    confidenceAria: (l) =>
      `probabilità ${{ high: 'alta', medium: 'media', low: 'bassa' }[l]}`,
    liveBadgeAria: 'In diretta ora',
    // "stream" is an invariable loanword in Italian: 1 stream, 3 stream.
    nStreams: (n) => `${n} stream`,
    jumpToDayAria: 'Vai a un giorno',
    streamsOnAria: (label) => `Stream: ${label}`,
    noStreamsExpected: 'Nessuno stream previsto',
    favoriteAria: (name) =>
      name ? `Aggiungi ${name} ai preferiti` : 'Aggiungi streamer ai preferiti',
    signInToFavoriteAria: (name) =>
      `Accedi per aggiungere ${name ?? 'questo streamer'} ai preferiti`,
    saveInAppAria: (name) => `Salva ${name ?? 'lo streamer'} nell'app`,
    signInTitle: 'Accedi per salvare i preferiti',
    saveInAppTitle: `Salva nell'app`,
    addToFavorites: 'Aggiungi ai preferiti',
    removeFromFavorites: 'Rimuovi dai preferiti',
    watchOnTwitch: 'Guarda su Twitch',
    watchOnYouTube: 'Guarda su YouTube',
    opensInNewTab: ' (si apre in una nuova scheda)',
    whyThisPrediction: 'Perché questa previsione?',
    autoSummary: 'Riepilogo automatico (in inglese)',
  },
  ru: {
    statusLiveSince: (d) => `В эфире уже ${d}`,
    statusEndsIn: (x) => `Закончится через ${x}`,
    statusAround: (h) => `Примерно в ${h}`,
    statusYourTime: (h) => `${h} (ваше время)`,
    statusWasExpected: (h) => `Ожидался примерно в ${h}`,
    statusOffline: 'Не в эфире',
    confidencePrefix: 'Вероятность:',
    confidenceLabels: { high: 'ВЫСОКАЯ', medium: 'СРЕДНЯЯ', low: 'НИЗКАЯ' },
    confidenceAria: (l) =>
      `вероятность ${{ high: 'высокая', medium: 'средняя', low: 'низкая' }[l]}`,
    liveBadgeAria: 'Сейчас в эфире',
    nStreams: (n) =>
      pluralForms('ru', n, {
        one: `${n} стрим`,
        few: `${n} стрима`,
        many: `${n} стримов`,
        other: `${n} стрима`,
      }),
    jumpToDayAria: 'Перейти к дню',
    streamsOnAria: (label) => `Стримы: ${label}`,
    noStreamsExpected: 'Стримы не ожидаются',
    favoriteAria: (name) =>
      name ? `Добавить ${name} в избранное` : 'Добавить стримера в избранное',
    signInToFavoriteAria: (name) =>
      `Войдите, чтобы добавить ${name ?? 'стримера'} в избранное`,
    saveInAppAria: (name) => `Сохраните ${name ?? 'стримера'} в приложении`,
    signInTitle: 'Войдите, чтобы сохранять избранное',
    saveInAppTitle: 'Сохранить в приложении',
    addToFavorites: 'Добавить в избранное',
    removeFromFavorites: 'Убрать из избранного',
    watchOnTwitch: 'Смотреть на Twitch',
    watchOnYouTube: 'Смотреть на YouTube',
    opensInNewTab: ' (откроется в новой вкладке)',
    whyThisPrediction: 'Почему такой прогноз?',
    autoSummary: 'Автоматическое резюме (на английском)',
  },
  ja: {
    statusLiveSince: (d) => `配信開始から${d}`,
    statusEndsIn: (x) => `終了まで ${x}`,
    statusAround: (h) => `開始予定 ${h}`,
    statusYourTime: (h) => `${h}（あなたの時間）`,
    statusWasExpected: (h) => `予想開始時刻: ${h}`,
    statusOffline: 'オフライン',
    confidencePrefix: '確度:',
    confidenceLabels: { high: '高', medium: '中', low: '低' },
    confidenceAria: (l) => `確度: ${{ high: '高', medium: '中', low: '低' }[l]}`,
    liveBadgeAria: '現在配信中',
    nStreams: (n) => `${n}件の配信`,
    jumpToDayAria: '日付へ移動',
    streamsOnAria: (label) => `${label}の配信`,
    noStreamsExpected: '配信予定なし',
    favoriteAria: (name) =>
      name ? `${name}をお気に入りに追加` : 'ストリーマーをお気に入りに追加',
    signInToFavoriteAria: (name) =>
      `サインインして${name ?? 'このストリーマー'}をお気に入りに追加`,
    saveInAppAria: (name) => `アプリで${name ?? 'ストリーマー'}を保存`,
    signInTitle: 'サインインしてお気に入りを保存',
    saveInAppTitle: 'アプリで保存',
    addToFavorites: 'お気に入りに追加',
    removeFromFavorites: 'お気に入りから削除',
    watchOnTwitch: 'Twitchで視聴',
    watchOnYouTube: 'YouTubeで視聴',
    opensInNewTab: '（新しいタブで開きます）',
    whyThisPrediction: 'この予測の理由',
    autoSummary: '自動要約（英語）',
  },
  uk: {
    statusLiveSince: (d) => `В ефірі вже ${d}`,
    statusEndsIn: (x) => `Завершиться через ${x}`,
    statusAround: (h) => `Приблизно о ${h}`,
    statusYourTime: (h) => `${h} (ваш час)`,
    statusWasExpected: (h) => `Очікувався приблизно о ${h}`,
    statusOffline: 'Не в ефірі',
    confidencePrefix: 'Ймовірність:',
    confidenceLabels: { high: 'ВИСОКА', medium: 'СЕРЕДНЯ', low: 'НИЗЬКА' },
    confidenceAria: (l) =>
      `ймовірність ${{ high: 'висока', medium: 'середня', low: 'низька' }[l]}`,
    liveBadgeAria: 'Зараз в ефірі',
    nStreams: (n) =>
      pluralForms('uk', n, {
        one: `${n} стрім`,
        few: `${n} стріми`,
        many: `${n} стрімів`,
        other: `${n} стріму`,
      }),
    jumpToDayAria: 'Перейти до дня',
    streamsOnAria: (label) => `Стріми: ${label}`,
    noStreamsExpected: 'Стрімів не очікується',
    favoriteAria: (name) =>
      name ? `Додати ${name} в обране` : 'Додати стримера в обране',
    signInToFavoriteAria: (name) =>
      `Увійдіть, щоб додати ${name ?? 'стримера'} в обране`,
    saveInAppAria: (name) => `Збережіть ${name ?? 'стримера'} у застосунку`,
    signInTitle: 'Увійдіть, щоб зберігати обране',
    saveInAppTitle: 'Зберегти в застосунку',
    addToFavorites: 'Додати в обране',
    removeFromFavorites: 'Прибрати з обраного',
    watchOnTwitch: 'Дивитися на Twitch',
    watchOnYouTube: 'Дивитися на YouTube',
    opensInNewTab: ' (відкриється в новій вкладці)',
    whyThisPrediction: 'Чому такий прогноз?',
    autoSummary: 'Автоматичний підсумок (англійською)',
  },
  ar: {
    // "مدة البث:" (broadcast duration) sidesteps the case governance that
    // "منذ" would impose on Intl's nominative duration output.
    statusLiveSince: (d) => `مدة البث: ${d}`,
    statusEndsIn: (x) => `ينتهي خلال ${x}`,
    statusAround: (h) => `حوالي ${h}`,
    statusYourTime: (h) => `${h} (بتوقيتك)`,
    statusWasExpected: (h) => `كان متوقعًا حوالي ${h}`,
    statusOffline: 'غير متصل',
    confidencePrefix: 'الاحتمالية:',
    confidenceLabels: { high: 'مرتفعة', medium: 'متوسطة', low: 'منخفضة' },
    confidenceAria: (l) =>
      `احتمالية ${{ high: 'مرتفعة', medium: 'متوسطة', low: 'منخفضة' }[l]}`,
    liveBadgeAria: 'يبث الآن',
    nStreams: (n) =>
      pluralForms('ar', n, {
        zero: 'لا توجد بثوث',
        one: 'بث واحد',
        two: 'بثان',
        few: `${n} بثوث`,
        many: `${n} بثًا`,
        other: `${n} بث`,
      }),
    jumpToDayAria: 'الانتقال إلى يوم',
    streamsOnAria: (label) => `البثوث: ${label}`,
    noStreamsExpected: 'لا بثوث متوقعة',
    favoriteAria: (name) =>
      name ? `إضافة ${name} إلى المفضلة` : 'إضافة الستريمر إلى المفضلة',
    signInToFavoriteAria: (name) =>
      `سجّل الدخول لإضافة ${name ?? 'هذا الستريمر'} إلى المفضلة`,
    saveInAppAria: (name) => `احفظ ${name ?? 'الستريمر'} في التطبيق`,
    signInTitle: 'سجّل الدخول لحفظ المفضلة',
    saveInAppTitle: 'احفظ في التطبيق',
    addToFavorites: 'أضف إلى المفضلة',
    removeFromFavorites: 'أزل من المفضلة',
    watchOnTwitch: 'شاهد على Twitch',
    watchOnYouTube: 'شاهد على YouTube',
    opensInNewTab: ' (يفتح في تبويب جديد)',
    whyThisPrediction: 'لماذا هذا التوقع؟',
    autoSummary: 'ملخص تلقائي (بالإنجليزية)',
  },
  hu: {
    // "Élőben: 2 óra" (elapsed live time) — Hungarian would need the -ja
    // suffix ("2 órája") that Intl's nominative output can't provide.
    statusLiveSince: (d) => `Élőben: ${d}`,
    statusEndsIn: (x) => `Vége ${x} múlva`,
    statusAround: (h) => `Kezdés kb. ${h}`,
    statusYourTime: (h) => `${h} (a te idődben)`,
    statusWasExpected: (h) => `Várt kezdés: ${h}`,
    statusOffline: 'Offline',
    confidencePrefix: 'Valószínűség:',
    confidenceLabels: { high: 'MAGAS', medium: 'KÖZEPES', low: 'ALACSONY' },
    confidenceAria: (l) =>
      `${{ high: 'magas', medium: 'közepes', low: 'alacsony' }[l]} valószínűség`,
    liveBadgeAria: 'Éppen élőben',
    nStreams: (n) => `${n} stream`,
    jumpToDayAria: 'Ugrás egy napra',
    streamsOnAria: (label) => `Streamek: ${label}`,
    noStreamsExpected: 'Nem várható stream',
    favoriteAria: (name) =>
      name ? `${name} hozzáadása a kedvencekhez` : 'Streamer hozzáadása a kedvencekhez',
    signInToFavoriteAria: (name) =>
      `Jelentkezz be, hogy ${name ?? 'ezt a streamert'} kedvencnek jelöld`,
    saveInAppAria: (name) => `Mentsd el az appban: ${name ?? 'streamer'}`,
    signInTitle: 'Jelentkezz be a kedvencek mentéséhez',
    saveInAppTitle: 'Mentés az appban',
    addToFavorites: 'Hozzáadás a kedvencekhez',
    removeFromFavorites: 'Eltávolítás a kedvencekből',
    watchOnTwitch: 'Nézd a Twitchen',
    watchOnYouTube: 'Nézd a YouTube-on',
    opensInNewTab: ' (új lapon nyílik meg)',
    whyThisPrediction: 'Miért ez az előrejelzés?',
    autoSummary: 'Automatikus összefoglaló (angolul)',
  },
  pl: {
    // "już 2 godziny" keeps Intl's nominative form grammatical ("od" would
    // require the genitive "2 godzin").
    statusLiveSince: (d) => `Na żywo już ${d}`,
    statusEndsIn: (x) => `Koniec za ${x}`,
    statusAround: (h) => `Około ${h}`,
    statusYourTime: (h) => `${h} (twój czas)`,
    statusWasExpected: (h) => `Oczekiwany około ${h}`,
    statusOffline: 'Offline',
    confidencePrefix: 'Prawdopodobieństwo:',
    confidenceLabels: { high: 'WYSOKIE', medium: 'ŚREDNIE', low: 'NISKIE' },
    confidenceAria: (l) =>
      `prawdopodobieństwo ${{ high: 'wysokie', medium: 'średnie', low: 'niskie' }[l]}`,
    liveBadgeAria: 'Teraz na żywo',
    nStreams: (n) =>
      pluralForms('pl', n, {
        one: `${n} stream`,
        few: `${n} streamy`,
        many: `${n} streamów`,
        other: `${n} streama`,
      }),
    jumpToDayAria: 'Przejdź do dnia',
    streamsOnAria: (label) => `Streamy: ${label}`,
    noStreamsExpected: 'Brak przewidywanych streamów',
    favoriteAria: (name) =>
      name ? `Dodaj ${name} do ulubionych` : 'Dodaj streamera do ulubionych',
    signInToFavoriteAria: (name) =>
      `Zaloguj się, aby dodać ${name ?? 'tego streamera'} do ulubionych`,
    saveInAppAria: (name) => `Zapisz ${name ?? 'streamera'} w aplikacji`,
    signInTitle: 'Zaloguj się, aby zapisywać ulubionych',
    saveInAppTitle: 'Zapisz w aplikacji',
    addToFavorites: 'Dodaj do ulubionych',
    removeFromFavorites: 'Usuń z ulubionych',
    watchOnTwitch: 'Oglądaj na Twitchu',
    watchOnYouTube: 'Oglądaj na YouTube',
    opensInNewTab: ' (otwiera się w nowej karcie)',
    whyThisPrediction: 'Skąd ta prognoza?',
    autoSummary: 'Automatyczne podsumowanie (po angielsku)',
  },
};

/** Slot lexicon for a stored broadcaster language; unknown/null → English. */
export function slotLexFor(language: string | null | undefined): SlotLex {
  return SLOT_STRINGS[resolveUiLang(language)];
}

/** All slot lexica keyed by language — exported for completeness tests. */
export { SLOT_STRINGS };
