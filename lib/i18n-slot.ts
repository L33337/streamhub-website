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
  /** "Live for {2 hours}" — duration comes from getRelativeTime(). ("Live since
   *  2 hours" was ungrammatical English; fixed in the game-hub UX round.) */
  statusLiveSince(duration: string): string;
  /** "Ends in {~2h}" — approx stays the language-neutral "~2h" form. */
  statusEndsIn(approx: string): string;
  /** "Around {hour}" — hour may carry the "your time" + zone suffix. */
  statusAround(hour: string): string;
  /** "{hour} your time" — viewer-local hour qualifier. */
  statusYourTime(hour: string): string;
  /** "Was expected around {hour}" — predicted start already passed. */
  statusWasExpected(hour: string): string;
  /** "No stream expected (usually around {hour})" — cancelled slot_kind. */
  statusNoStreamExpected(hour: string): string;
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
  /** Live-card overlay: "{3.1K} watching"; v arrives compact-formatted. */
  viewersWatching(v: string): string;
  /** Slot detail page (/schedule/[id]) labels, visible with their colon. */
  detailCategory: string;
  detailScheduled: string;
  detailStarted: string;
  /** Start label of a cancelled slot ("Usually streams:"). */
  detailUsually: string;
  detailDuration: string;
  /** Always-on channel, next to the 24/7 badge. */
  detailStreaming: string;
  /** Labelled .ics button on the slot detail page. */
  addToCalendar: string;
  /** Badge on a cancelled slot (rendered uppercase). */
  cancelledBadge: string;
  /** Why a cancelled slot expects no stream (DTO cancel_source); null = unknown. Never claims an announcement for 'cold' or unknown. */
  cancelledReason(source: 'break' | 'vacation' | 'withdrawn' | 'cold' | null): string;
  /** "Next stream:" — prefix of the forward pointer on a day with nothing scheduled. */
  nextStreamPrefix: string;
  /** "Show 6 more streams" — expands the truncated 7-day schedule. */
  showMoreStreams(n: number): string;
  /** Collapses it again. */
  showFewerStreams: string;
  /** M22 P4: title attributes of the NextStreamTime timestamps. */
  nextTimePredictedTitle: string;
  nextTimeAnnouncedTitle: string;
  /** M22 S4.1: GameCard stat lines on the /games catalog (client component). */
  gameLiveBadge(n: number): string;
  gameStreamerCount(n: number): string;
  /** h / v arrive already compact-formatted (formatCompactNumber). */
  gameHoursShort(h: string): string;
  gameWatchingNow(v: string): string;
  gameTrendTitle: string;
}

const SLOT_STRINGS: Record<UiLang, SlotLex> = {
  en: {
    statusLiveSince: (d) => `Live for ${d}`,
    statusEndsIn: (x) => `Ends in ${x}`,
    statusAround: (h) => `Around ${h}`,
    statusYourTime: (h) => `${h} your time`,
    statusWasExpected: (h) => `Was expected around ${h}`,
    statusNoStreamExpected: (h) => `No stream expected (usually around ${h})`,
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
    viewersWatching: (v) => `${v} watching`,
    detailCategory: 'Category:',
    detailScheduled: 'Scheduled:',
    detailStarted: 'Started:',
    detailUsually: 'Usually streams:',
    detailDuration: 'Duration:',
    detailStreaming: 'Streaming:',
    addToCalendar: 'Add to calendar',
    cancelledBadge: 'Cancelled',
    cancelledReason: (source) =>
      source === 'break'
        ? 'No stream expected: the streamer announced a break.'
        : source === 'vacation'
          ? 'No stream expected: the streamer announced time off.'
          : source === 'withdrawn'
            ? 'No stream expected: the announced stream was removed from the schedule.'
            : source === 'cold'
              ? 'No stream expected: the streamer has been quieter than usual lately.'
              : 'No stream expected at this usually regular time.',
    nextStreamPrefix: 'Next stream:',
    showMoreStreams: (n) => `Show ${n} more ${n === 1 ? 'stream' : 'streams'}`,
    showFewerStreams: 'Show fewer',
    nextTimePredictedTitle: 'AI-predicted start time',
    nextTimeAnnouncedTitle: 'Announced schedule start',
    gameLiveBadge: (n) => `${n} live`,
    gameStreamerCount: (n) => `${n} streamer${n === 1 ? '' : 's'}`,
    gameHoursShort: (h) => `${h}h · 28d`,
    gameWatchingNow: (v) => `${v} watching now`,
    gameTrendTitle: 'Week-over-week change in active streamers',
  },
  de: {
    statusLiveSince: (d) => `Live seit ${d}`,
    statusEndsIn: (x) => `Endet in ${x}`,
    statusAround: (h) => `Gegen ${h}`,
    statusYourTime: (h) => `${h} (deine Zeit)`,
    // Prefix form: `h` carries the "· 23:00 CEST" suffix on the client, which
    // would break a verb-final German sentence frame.
    statusWasExpected: (h) => `Erwartet gegen ${h}`,
    statusNoStreamExpected: (h) => `Kein Stream erwartet (sonst meist gegen ${h})`,
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
    viewersWatching: (v) => `${v} Zuschauer`,
    detailCategory: 'Kategorie:',
    detailScheduled: 'Geplant:',
    detailStarted: 'Gestartet:',
    detailUsually: 'Sonst meist:',
    detailDuration: 'Dauer:',
    detailStreaming: 'Sendet:',
    addToCalendar: 'Zum Kalender hinzufügen',
    cancelledBadge: 'Abgesagt',
    cancelledReason: (source) =>
      source === 'break'
        ? 'Kein Stream erwartet: Der Streamer hat eine Pause angekündigt.'
        : source === 'vacation'
          ? 'Kein Stream erwartet: Der Streamer hat eine Auszeit angekündigt.'
          : source === 'withdrawn'
            ? 'Kein Stream erwartet: Der angekündigte Stream wurde aus dem Plan genommen.'
            : source === 'cold'
              ? 'Kein Stream erwartet: Der Streamer war zuletzt ruhiger als sonst.'
              : 'Zu dieser sonst üblichen Zeit wird kein Stream erwartet.',
    nextStreamPrefix: 'Nächster Stream:',
    showMoreStreams: (n) =>
      n === 1 ? '1 weiteren Stream anzeigen' : `${n} weitere Streams anzeigen`,
    showFewerStreams: 'Weniger anzeigen',
    nextTimePredictedTitle: 'KI-prognostizierte Startzeit',
    nextTimeAnnouncedTitle: 'Angekündigter Start laut Sendeplan',
    gameLiveBadge: (n) => `${n} live`,
    gameStreamerCount: (n) => `${n} Streamer`,
    gameHoursShort: (h) => `${h} Std. · 28 Tage`,
    gameWatchingNow: (v) => `${v} schauen gerade zu`,
    gameTrendTitle: 'Veränderung aktiver Streamer zur Vorwoche',
  },
  es: {
    statusLiveSince: (d) => `En directo desde hace ${d}`,
    statusEndsIn: (x) => `Termina en ${x}`,
    statusAround: (h) => `Sobre las ${h}`,
    statusYourTime: (h) => `${h} (tu hora)`,
    statusWasExpected: (h) => `Se esperaba sobre las ${h}`,
    statusNoStreamExpected: (h) => `No se espera stream (normalmente sobre las ${h})`,
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
    viewersWatching: (v) => `${v} viendo`,
    detailCategory: 'Categoría:',
    detailScheduled: 'Programado:',
    detailStarted: 'Empezó:',
    detailUsually: 'Suele hacer stream:',
    detailDuration: 'Duración:',
    detailStreaming: 'Emite:',
    addToCalendar: 'Añadir al calendario',
    cancelledBadge: 'Cancelado',
    cancelledReason: (source) =>
      source === 'break'
        ? 'No se espera stream: el streamer anunció un descanso.'
        : source === 'vacation'
          ? 'No se espera stream: el streamer anunció unos días libres.'
          : source === 'withdrawn'
            ? 'No se espera stream: el stream anunciado se retiró del horario.'
            : source === 'cold'
              ? 'No se espera stream: el streamer ha estado más tranquilo de lo habitual.'
              : 'No se espera stream a esta hora habitual.',
    nextStreamPrefix: 'Próximo stream:',
    showMoreStreams: (n) => (n === 1 ? 'Ver 1 stream más' : `Ver ${n} streams más`),
    showFewerStreams: 'Ver menos',
    nextTimePredictedTitle: 'Hora de inicio predicha por IA',
    nextTimeAnnouncedTitle: 'Inicio anunciado en el horario',
    gameLiveBadge: (n) => `${n} live`,
    gameStreamerCount: (n) => `${n} streamer${n === 1 ? '' : 's'}`,
    gameHoursShort: (h) => `${h} h · 28 días`,
    gameWatchingNow: (v) => `${v} viendo ahora`,
    gameTrendTitle: 'Cambio de streamers activos respecto a la semana pasada',
  },
  fr: {
    statusLiveSince: (d) => `En live depuis ${d}`,
    statusEndsIn: (x) => `Se termine dans ${x}`,
    statusAround: (h) => `Vers ${h}`,
    statusYourTime: (h) => `${h} (ton heure)`,
    statusWasExpected: (h) => `Était attendu vers ${h}`,
    statusNoStreamExpected: (h) => `Aucun stream prévu (habituellement vers ${h})`,
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
    viewersWatching: (v) => `${v} spectateurs`,
    detailCategory: 'Catégorie :',
    detailScheduled: 'Prévu :',
    detailStarted: 'Commencé :',
    detailUsually: 'Habituellement :',
    detailDuration: 'Durée :',
    detailStreaming: 'Diffusion :',
    addToCalendar: 'Ajouter au calendrier',
    cancelledBadge: 'Annulé',
    cancelledReason: (source) =>
      source === 'break'
        ? 'Aucun stream prévu : le streamer a annoncé une pause.'
        : source === 'vacation'
          ? 'Aucun stream prévu : le streamer a annoncé des congés.'
          : source === 'withdrawn'
            ? 'Aucun stream prévu : le stream annoncé a été retiré du planning.'
            : source === 'cold'
              ? 'Aucun stream prévu : le streamer est plus calme que d’habitude.'
              : 'Aucun stream prévu à cette heure habituelle.',
    nextStreamPrefix: 'Prochain stream :',
    showMoreStreams: (n) =>
      n === 1 ? 'Voir 1 stream de plus' : `Voir ${n} streams de plus`,
    showFewerStreams: 'Voir moins',
    nextTimePredictedTitle: "Heure de début prédite par l'IA",
    nextTimeAnnouncedTitle: 'Début annoncé au programme',
    gameLiveBadge: (n) => `${n} live`,
    gameStreamerCount: (n) => `${n} streamer${n === 1 ? '' : 's'}`,
    gameHoursShort: (h) => `${h} h · 28 jours`,
    gameWatchingNow: (v) => `${v} spectateurs en ce moment`,
    gameTrendTitle: 'Évolution des streamers actifs par rapport à la semaine dernière',
  },
  pt: {
    statusLiveSince: (d) => `Ao vivo há ${d}`,
    statusEndsIn: (x) => `Termina em ${x}`,
    statusAround: (h) => `Por volta das ${h}`,
    statusYourTime: (h) => `${h} (seu horário)`,
    statusWasExpected: (h) => `Era esperado por volta das ${h}`,
    statusNoStreamExpected: (h) => `Nenhum stream previsto (normalmente por volta das ${h})`,
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
    viewersWatching: (v) => `${v} assistindo`,
    detailCategory: 'Categoria:',
    detailScheduled: 'Agendado:',
    detailStarted: 'Começou:',
    detailUsually: 'Costuma fazer stream:',
    detailDuration: 'Duração:',
    detailStreaming: 'Transmite:',
    addToCalendar: 'Adicionar ao calendário',
    cancelledBadge: 'Cancelado',
    cancelledReason: (source) =>
      source === 'break'
        ? 'Nenhum stream previsto: o streamer anunciou uma pausa.'
        : source === 'vacation'
          ? 'Nenhum stream previsto: o streamer anunciou uma folga.'
          : source === 'withdrawn'
            ? 'Nenhum stream previsto: o stream anunciado foi retirado da agenda.'
            : source === 'cold'
              ? 'Nenhum stream previsto: o streamer anda mais quieto que o normal.'
              : 'Nenhum stream previsto neste horário habitual.',
    nextStreamPrefix: 'Próximo stream:',
    showMoreStreams: (n) => (n === 1 ? 'Ver mais 1 stream' : `Ver mais ${n} streams`),
    showFewerStreams: 'Ver menos',
    nextTimePredictedTitle: 'Horário de início previsto por IA',
    nextTimeAnnouncedTitle: 'Início anunciado na agenda',
    gameLiveBadge: (n) => `${n} live`,
    gameStreamerCount: (n) => `${n} streamer${n === 1 ? '' : 's'}`,
    gameHoursShort: (h) => `${h} h · 28 dias`,
    gameWatchingNow: (v) => `${v} assistindo agora`,
    gameTrendTitle: 'Variação de streamers ativos em relação à semana passada',
  },
  it: {
    statusLiveSince: (d) => `In diretta da ${d}`,
    statusEndsIn: (x) => `Termina tra ${x}`,
    statusAround: (h) => `Verso le ${h}`,
    statusYourTime: (h) => `${h} (la tua ora)`,
    statusWasExpected: (h) => `Era previsto verso le ${h}`,
    statusNoStreamExpected: (h) => `Nessuno stream previsto (di solito verso le ${h})`,
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
    viewersWatching: (v) => `${v} spettatori`,
    detailCategory: 'Categoria:',
    detailScheduled: 'Previsto:',
    detailStarted: 'Iniziato:',
    detailUsually: 'Di solito:',
    detailDuration: 'Durata:',
    detailStreaming: 'In onda:',
    addToCalendar: 'Aggiungi al calendario',
    cancelledBadge: 'Annullato',
    cancelledReason: (source) =>
      source === 'break'
        ? 'Nessuno stream previsto: lo streamer ha annunciato una pausa.'
        : source === 'vacation'
          ? 'Nessuno stream previsto: lo streamer ha annunciato un periodo di ferie.'
          : source === 'withdrawn'
            ? 'Nessuno stream previsto: lo stream annunciato è stato tolto dal programma.'
            : source === 'cold'
              ? 'Nessuno stream previsto: lo streamer è più tranquillo del solito.'
              : 'Nessuno stream previsto a quest’ora abituale.',
    nextStreamPrefix: 'Prossimo stream:',
    showMoreStreams: (n) =>
      n === 1 ? 'Mostra un altro stream' : `Mostra altri ${n} stream`,
    showFewerStreams: 'Mostra meno',
    nextTimePredictedTitle: "Orario di inizio previsto dall'IA",
    nextTimeAnnouncedTitle: 'Inizio annunciato in programma',
    gameLiveBadge: (n) => `${n} live`,
    gameStreamerCount: (n) => `${n} streamer`,
    gameHoursShort: (h) => `${h} h · 28 giorni`,
    gameWatchingNow: (v) => `${v} spettatori ora`,
    gameTrendTitle: 'Variazione degli streamer attivi rispetto alla settimana scorsa',
  },
  ru: {
    statusLiveSince: (d) => `В эфире уже ${d}`,
    statusEndsIn: (x) => `Закончится через ${x}`,
    statusAround: (h) => `Примерно в ${h}`,
    statusYourTime: (h) => `${h} (ваше время)`,
    statusWasExpected: (h) => `Ожидался примерно в ${h}`,
    statusNoStreamExpected: (h) => `Стрим не ожидается (обычно примерно в ${h})`,
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
    viewersWatching: (v) => `${v} зрителей`,
    detailCategory: 'Категория:',
    detailScheduled: 'Запланировано:',
    detailStarted: 'Начался:',
    detailUsually: 'Обычно:',
    detailDuration: 'Длительность:',
    detailStreaming: 'Вещание:',
    addToCalendar: 'Добавить в календарь',
    cancelledBadge: 'Отменён',
    cancelledReason: (source) =>
      source === 'break'
        ? 'Стрим не ожидается: стример объявил перерыв.'
        : source === 'vacation'
          ? 'Стрим не ожидается: стример объявил отпуск.'
          : source === 'withdrawn'
            ? 'Стрим не ожидается: объявленный стрим убран из расписания.'
            : source === 'cold'
              ? 'Стрим не ожидается: в последнее время стример тише обычного.'
              : 'В это обычное время стрим не ожидается.',
    nextStreamPrefix: 'Следующий стрим:',
    showMoreStreams: (n) =>
      pluralForms('ru', n, {
        one: `Показать ещё ${n} стрим`,
        few: `Показать ещё ${n} стрима`,
        many: `Показать ещё ${n} стримов`,
        other: `Показать ещё ${n} стрима`,
      }),
    showFewerStreams: 'Показать меньше',
    nextTimePredictedTitle: 'Время начала, предсказанное ИИ',
    nextTimeAnnouncedTitle: 'Анонсированное время начала',
    gameLiveBadge: (n) => `${n} live`,
    gameStreamerCount: (n) =>
      `${n} ${pluralForms('ru', n, {
        one: 'стример',
        few: 'стримера',
        many: 'стримеров',
        other: 'стримера',
      })}`,
    gameHoursShort: (h) => `${h} ч · 28 дней`,
    gameWatchingNow: (v) => `${v} смотрят сейчас`,
    gameTrendTitle: 'Изменение числа активных стримеров к прошлой неделе',
  },
  ja: {
    statusLiveSince: (d) => `配信開始から${d}`,
    statusEndsIn: (x) => `終了まで ${x}`,
    statusAround: (h) => `開始予定 ${h}`,
    statusYourTime: (h) => `${h}（あなたの時間）`,
    statusWasExpected: (h) => `予想開始時刻: ${h}`,
    statusNoStreamExpected: (h) => `配信予定なし（いつもは${h}頃）`,
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
    viewersWatching: (v) => `${v}人が視聴中`,
    detailCategory: 'カテゴリ：',
    detailScheduled: '予定：',
    detailStarted: '開始：',
    detailUsually: 'いつもは：',
    detailDuration: '長さ：',
    detailStreaming: '配信：',
    addToCalendar: 'カレンダーに追加',
    cancelledBadge: '中止',
    cancelledReason: (source) =>
      source === 'break'
        ? '配信予定なし：配信者が休みを告知しました。'
        : source === 'vacation'
          ? '配信予定なし：配信者が休暇を告知しました。'
          : source === 'withdrawn'
            ? '配信予定なし：告知された配信がスケジュールから削除されました。'
            : source === 'cold'
              ? '配信予定なし：最近はいつもより配信が少なめです。'
              : 'いつもの時間ですが、配信予定はありません。',
    nextStreamPrefix: '次の配信:',
    showMoreStreams: (n) => `他${n}件の配信を表示`,
    showFewerStreams: '表示を減らす',
    nextTimePredictedTitle: 'AIが予測した開始時刻',
    nextTimeAnnouncedTitle: '告知済みの開始時刻',
    gameLiveBadge: (n) => `${n} live`,
    gameStreamerCount: (n) => `${n}人のストリーマー`,
    gameHoursShort: (h) => `${h}時間 · 28日間`,
    gameWatchingNow: (v) => `${v}人が視聴中`,
    gameTrendTitle: '前週比のアクティブなストリーマー数の変化',
  },
  uk: {
    statusLiveSince: (d) => `В ефірі вже ${d}`,
    statusEndsIn: (x) => `Завершиться через ${x}`,
    statusAround: (h) => `Приблизно о ${h}`,
    statusYourTime: (h) => `${h} (ваш час)`,
    statusWasExpected: (h) => `Очікувався приблизно о ${h}`,
    statusNoStreamExpected: (h) => `Стрім не очікується (зазвичай приблизно о ${h})`,
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
    viewersWatching: (v) => `${v} глядачів`,
    detailCategory: 'Категорія:',
    detailScheduled: 'Заплановано:',
    detailStarted: 'Почався:',
    detailUsually: 'Зазвичай:',
    detailDuration: 'Тривалість:',
    detailStreaming: 'Мовлення:',
    addToCalendar: 'Додати в календар',
    cancelledBadge: 'Скасовано',
    cancelledReason: (source) =>
      source === 'break'
        ? 'Стрім не очікується: стример оголосив перерву.'
        : source === 'vacation'
          ? 'Стрім не очікується: стример оголосив відпустку.'
          : source === 'withdrawn'
            ? 'Стрім не очікується: оголошений стрім прибрано з розкладу.'
            : source === 'cold'
              ? 'Стрім не очікується: останнім часом стример тихіший, ніж зазвичай.'
              : 'У цей звичний час стрім не очікується.',
    nextStreamPrefix: 'Наступний стрім:',
    showMoreStreams: (n) =>
      pluralForms('uk', n, {
        one: `Показати ще ${n} стрім`,
        few: `Показати ще ${n} стріми`,
        many: `Показати ще ${n} стрімів`,
        other: `Показати ще ${n} стріму`,
      }),
    showFewerStreams: 'Показати менше',
    nextTimePredictedTitle: 'Час початку, передбачений ШІ',
    nextTimeAnnouncedTitle: 'Анонсований час початку',
    gameLiveBadge: (n) => `${n} live`,
    gameStreamerCount: (n) =>
      `${n} ${pluralForms('uk', n, {
        one: 'стример',
        few: 'стримери',
        many: 'стримерів',
        other: 'стримера',
      })}`,
    gameHoursShort: (h) => `${h} год · 28 днів`,
    gameWatchingNow: (v) => `${v} дивляться зараз`,
    gameTrendTitle: 'Зміна кількості активних стримерів проти минулого тижня',
  },
  ar: {
    // "مدة البث:" (broadcast duration) sidesteps the case governance that
    // "منذ" would impose on Intl's nominative duration output.
    statusLiveSince: (d) => `مدة البث: ${d}`,
    statusEndsIn: (x) => `ينتهي خلال ${x}`,
    statusAround: (h) => `حوالي ${h}`,
    statusYourTime: (h) => `${h} (بتوقيتك)`,
    statusWasExpected: (h) => `كان متوقعًا حوالي ${h}`,
    statusNoStreamExpected: (h) => `لا يُتوقع بث (عادةً حوالي ${h})`,
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
    viewersWatching: (v) => `${v} يشاهدون`,
    detailCategory: 'الفئة:',
    detailScheduled: 'موعد البث:',
    detailStarted: 'بدأ:',
    detailUsually: 'عادةً:',
    detailDuration: 'المدة:',
    detailStreaming: 'البث:',
    addToCalendar: 'أضف إلى التقويم',
    cancelledBadge: 'ملغى',
    cancelledReason: (source) =>
      source === 'break'
        ? 'لا يُتوقع بث: أعلن صانع المحتوى عن استراحة.'
        : source === 'vacation'
          ? 'لا يُتوقع بث: أعلن صانع المحتوى عن إجازة.'
          : source === 'withdrawn'
            ? 'لا يُتوقع بث: أُزيل البث المعلن من الجدول.'
            : source === 'cold'
              ? 'لا يُتوقع بث: صانع المحتوى أهدأ من المعتاد مؤخرًا.'
              : 'لا يُتوقع بث في هذا الوقت المعتاد.',
    nextStreamPrefix: 'البث القادم:',
    showMoreStreams: (n) =>
      pluralForms('ar', n, {
        one: 'عرض بث إضافي واحد',
        two: 'عرض بثين إضافيين',
        few: `عرض ${n} بثوث إضافية`,
        many: `عرض ${n} بثًا إضافيًا`,
        other: `عرض ${n} بث إضافي`,
      }),
    showFewerStreams: 'عرض أقل',
    nextTimePredictedTitle: 'وقت بدء متوقع بالذكاء الاصطناعي',
    nextTimeAnnouncedTitle: 'وقت بدء معلن في الجدول',
    gameLiveBadge: (n) => `${n} live`,
    gameStreamerCount: (n) =>
      `${n} ${pluralForms('ar', n, {
        zero: 'ستريمر',
        one: 'ستريمر',
        two: 'ستريمر',
        few: 'ستريمرز',
        many: 'ستريمر',
        other: 'ستريمر',
      })}`,
    gameHoursShort: (h) => `${h} ساعة · 28 يومًا`,
    gameWatchingNow: (v) => `${v} يشاهدون الآن`,
    gameTrendTitle: 'تغيّر عدد الستريمرز النشطين مقارنة بالأسبوع الماضي',
  },
  hu: {
    // "Élőben: 2 óra" (elapsed live time) — Hungarian would need the -ja
    // suffix ("2 órája") that Intl's nominative output can't provide.
    statusLiveSince: (d) => `Élőben: ${d}`,
    statusEndsIn: (x) => `Vége ${x} múlva`,
    statusAround: (h) => `Kezdés kb. ${h}`,
    statusYourTime: (h) => `${h} (a te idődben)`,
    statusWasExpected: (h) => `Várt kezdés: ${h}`,
    statusNoStreamExpected: (h) => `Nem várható stream (általában kb. ${h})`,
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
    viewersWatching: (v) => `${v} néző`,
    detailCategory: 'Kategória:',
    detailScheduled: 'Tervezett:',
    detailStarted: 'Kezdés:',
    detailUsually: 'Általában:',
    detailDuration: 'Időtartam:',
    detailStreaming: 'Adás:',
    addToCalendar: 'Hozzáadás a naptárhoz',
    cancelledBadge: 'Elmarad',
    cancelledReason: (source) =>
      source === 'break'
        ? 'Nem várható stream: a streamer szünetet jelentett be.'
        : source === 'vacation'
          ? 'Nem várható stream: a streamer szabadságot jelentett be.'
          : source === 'withdrawn'
            ? 'Nem várható stream: a bejelentett streamet levették a menetrendből.'
            : source === 'cold'
              ? 'Nem várható stream: a streamer mostanában csendesebb a szokásosnál.'
              : 'Ebben a szokásos időpontban nem várható stream.',
    nextStreamPrefix: 'Következő stream:',
    showMoreStreams: (n) => `Még ${n} stream megjelenítése`,
    showFewerStreams: 'Kevesebb megjelenítése',
    nextTimePredictedTitle: 'AI által jósolt kezdés',
    nextTimeAnnouncedTitle: 'Bejelentett kezdési idő',
    gameLiveBadge: (n) => `${n} live`,
    gameStreamerCount: (n) => `${n} streamer`,
    gameHoursShort: (h) => `${h} óra · 28 nap`,
    gameWatchingNow: (v) => `${v} néző most`,
    gameTrendTitle: 'Az aktív streamerek számának változása az előző héthez képest',
  },
  pl: {
    // "już 2 godziny" keeps Intl's nominative form grammatical ("od" would
    // require the genitive "2 godzin").
    statusLiveSince: (d) => `Na żywo już ${d}`,
    statusEndsIn: (x) => `Koniec za ${x}`,
    statusAround: (h) => `Około ${h}`,
    statusYourTime: (h) => `${h} (twój czas)`,
    statusWasExpected: (h) => `Oczekiwany około ${h}`,
    statusNoStreamExpected: (h) => `Brak przewidywanego streamu (zwykle około ${h})`,
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
    viewersWatching: (v) => `${v} ogląda`,
    detailCategory: 'Kategoria:',
    detailScheduled: 'Zaplanowano:',
    detailStarted: 'Rozpoczęto:',
    detailUsually: 'Zwykle:',
    detailDuration: 'Czas trwania:',
    detailStreaming: 'Nadaje:',
    addToCalendar: 'Dodaj do kalendarza',
    cancelledBadge: 'Odwołany',
    cancelledReason: (source) =>
      source === 'break'
        ? 'Nie oczekujemy streamu: streamer zapowiedział przerwę.'
        : source === 'vacation'
          ? 'Nie oczekujemy streamu: streamer zapowiedział urlop.'
          : source === 'withdrawn'
            ? 'Nie oczekujemy streamu: zapowiedziany stream usunięto z planu.'
            : source === 'cold'
              ? 'Nie oczekujemy streamu: streamer ostatnio jest spokojniejszy niż zwykle.'
              : 'W tym zwykłym terminie nie oczekujemy streamu.',
    nextStreamPrefix: 'Następny stream:',
    showMoreStreams: (n) =>
      pluralForms('pl', n, {
        one: `Pokaż jeszcze ${n} stream`,
        few: `Pokaż jeszcze ${n} streamy`,
        many: `Pokaż jeszcze ${n} streamów`,
        other: `Pokaż jeszcze ${n} streama`,
      }),
    showFewerStreams: 'Pokaż mniej',
    nextTimePredictedTitle: 'Czas startu przewidziany przez AI',
    nextTimeAnnouncedTitle: 'Zapowiedziany czas startu',
    gameLiveBadge: (n) => `${n} live`,
    gameStreamerCount: (n) =>
      `${n} ${pluralForms('pl', n, {
        one: 'streamer',
        few: 'streamerów',
        many: 'streamerów',
        other: 'streamera',
      })}`,
    gameHoursShort: (h) => `${h} godz. · 28 dni`,
    gameWatchingNow: (v) => `${v} ogląda teraz`,
    gameTrendTitle: 'Zmiana liczby aktywnych streamerów względem zeszłego tygodnia',
  },
};

/** Slot lexicon for a stored broadcaster language; unknown/null → English. */
export function slotLexFor(language: string | null | undefined): SlotLex {
  return SLOT_STRINGS[resolveUiLang(language)];
}

/** All slot lexica keyed by language — exported for completeness tests. */
export { SLOT_STRINGS };
