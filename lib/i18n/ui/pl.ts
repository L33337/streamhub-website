import { pluralForms } from '../../i18n-core';
import type { UiLex } from '../types';

// Polish — informal ty-form (streaming register); stream/streamer loanwords as
// used by the community. Plurals via Intl.PluralRules
// (1 stream / 2 streamy / 5 streamów).
const streamsN = (n: number) =>
  pluralForms('pl', n, {
    one: `${n} stream`,
    few: `${n} streamy`,
    many: `${n} streamów`,
    other: `${n} streama`,
  });

export const pl: UiLex = {
  breadcrumb: {
    home: 'Strona główna',
    streamers: 'Streamerzy',
  },
  hero: {
    featured: 'Wyróżniony',
    nowStreaming: 'Teraz streamuje:',
    avatarAlt: (name) => `Awatar ${name}`,
  },
  promo: {
    valueProps: [
      'Zapisuj ulubionych streamerów',
      'Dostawaj powiadomienie, gdy tylko wchodzą na żywo',
      'Dodaj dowolnego streamera w kilka sekund',
    ],
    qrAria: 'Kod QR — zeskanuj telefonem, aby pobrać aplikację Streamer Times',
    getApp: 'Pobierz aplikację',
  },
  lastStream: {
    heading: 'Ostatni stream',
    pastStream: 'Poprzedni stream',
    watchVod: 'Obejrzyj VOD →',
    watchAria: (name, title) => `Obejrzyj ostatni stream ${name}: ${title}`,
  },
  recent: {
    heading: 'Ostatnie streamy',
    vodAria: (title) => `Obejrzyj VOD: ${title}`,
  },
  channelStats: {
    heading: 'Statystyki kanału',
    followers: 'Obserwujący',
    subscribers: 'Subskrybenci',
    avgViewers: 'Średnia widzów',
    medianDetail: 'mediana z 28 dni',
    peakViewers: 'Rekord widzów',
    hoursStreamed: 'Godziny streamowania',
    lastNDays: (n) => `ostatnie ${n} dni`,
  },
  stats: {
    heading: (name) => `Kiedy streamuje ${name}?`,
    // `tz` is the cityTime label ("czas Berlin") — parenthetical/colon
    // constructions avoid the case government a preposition would impose.
    caption: (name, tz) =>
      `Typowe godziny streamów ${name} według dni tygodnia (${tz})`,
    colDay: 'Dzień',
    colTime: 'Typowa godzina',
    colDuration: 'Długość',
    usuallyNoStream: 'Zwykle brak streama',
    streamsPerWeek: 'Streamy w tygodniu',
    typicalLength: 'Typowa długość streama',
    topCategories: 'Najczęściej streamowane kategorie',
    basedOn: (n, d) => {
      const streams = pluralForms('pl', n, {
        one: `${n} streama`,
        few: `${n} streamów`,
        many: `${n} streamów`,
        other: `${n} streama`,
      });
      return `Na podstawie ${streams} z ostatnich ${d} dni.`;
    },
    allTimesIn: (tz) => `Strefa czasowa: ${tz}`,
    cityTime: (city) => `czas ${city}`,
    leadSentence: (name, days, times) => {
      const dayWord = pluralForms('pl', days, {
        one: `${days} dzień`,
        few: `${days} dni`,
        many: `${days} dni`,
        other: `${days} dnia`,
      });
      const base = `${name} zwykle streamuje ${dayWord} w tygodniu`;
      return times
        ? `${base}, najczęściej między ${times.start} a ${times.end} (${times.tzLabel}).`
        : `${base}.`;
    },
  },
  faq: {
    heading: 'Częste pytania',
    qIsLive: (name) => `Czy ${name} jest teraz na żywo?`,
    aIsLiveCat: (name, cat, platforms) =>
      `Tak — ${name} jest teraz na żywo i streamuje ${cat} na ${platforms}.`,
    aIsLive: (name, platforms) => `Tak — ${name} jest teraz na żywo na ${platforms}.`,
    qUsually: (name) => `Kiedy zwykle streamuje ${name}?`,
    typicallyLast: (duration) => `Streamy trwają zwykle około ${duration}.`,
    qSchedule: (name) => `Jaki jest harmonogram streamów ${name}?`,
    aScheduleLead: (name, n) =>
      `${name} ma w harmonogramie ${streamsN(n)} na najbliższe 7 dni.`,
    nextUp: (entry) => `Najbliższy: ${entry}.`,
    afterThat: (list) => `Potem: ${list}.`,
    plusMore: (n) => `Plus jeszcze ${n} — pełny harmonogram powyżej.`,
    // Colon construction like stats.allTimesIn — avoids the case government
    // a preposition would impose on the cityTime label.
    allTimesNote: (tz) => `Wszystkie godziny: ${tz}.`,
    predictedNote:
      'Godziny oznaczone jako przewidywania są szacowane przez AI na podstawie wcześniejszych wzorców streamowania.',
    outsideDates: (name, time, tz) =>
      `Poza tymi terminami ${name} zwykle wchodzi na żywo około ${time} (${tz}) — zobacz typowe godziny streamów powyżej.`,
    predictedMarker: 'przewidywany',
    qGames: (name) => `W co gra ${name} na streamach?`,
    aGamesOne: (name, cat) =>
      `${name} streamuje obecnie ${cat}. Nadchodzące streamy znajdziesz w harmonogramie powyżej.`,
    aGamesMany: (name, list) =>
      `${name} streamuje ${list}. W harmonogramie powyżej zobaczysz, co będzie dalej.`,
    qHowOften: (name) => `Jak często streamuje ${name}?`,
    aAlwaysOn: (name, platforms) =>
      `${name} streamuje 24/7 — kanał jest cały czas na żywo na ${platforms}.`,
    aPerWeek: (name, perWeek, windowDays) =>
      `${name} streamuje średnio około ${perWeek} razy w tygodniu, na podstawie transmisji z ostatnich ${windowDays} dni.`,
    aScheduleCount: (name, n, daysList) => {
      const base = `${name} ma w harmonogramie ${streamsN(n)} na najbliższe 7 dni`;
      return daysList ? `${base}, w dni: ${daysList}.` : `${base}.`;
    },
    qWhere: (name) => `Gdzie mogę oglądać ${name}?`,
    aWhere: (name, platforms) =>
      `${name} streamuje na żywo na ${platforms}. Dodaj ${name} w Streamer Times, aby śledzić status na żywo i nadchodzące streamy w jednym miejscu.`,
    qTimezone: (name) => `W jakiej strefie czasowej streamuje ${name}?`,
    aTimezone: (name, tzCity) =>
      `${name} mieszka w strefie czasowej ${tzCity}. Harmonogram na tej stronie pokazuje każdy stream w twoim czasie lokalnym i w czasie lokalnym ${name}.`,
    qPredicted: (name) => `Czy godziny streamów ${name} są przewidywane, czy potwierdzone?`,
    aAllPredicted: (name) =>
      `Nadchodzące godziny streamów ${name} to przewidywania AI oparte na wcześniejszych wzorcach, każde z wysokim, średnim lub niskim prawdopodobieństwem. Potwierdzone godziny pojawią się tutaj, gdy tylko zostaną ogłoszone.`,
    aMixed: (name, predicted, total) =>
      `Harmonogram ${name} łączy przewidywania AI z potwierdzonymi streamami. ${predicted} z ${total} nadchodzących godzin to przewidywania na podstawie wcześniejszych wzorców, oznaczone poziomem prawdopodobieństwa.`,
  },
  empty: {
    heading: 'Brak zaplanowanych streamów',
    body: (name, platforms) =>
      `Śledzimy streamy ${name} na ${platforms}. Przewidywania AI i potwierdzone harmonogramy pojawią się tutaj, gdy zbierze się wystarczająca historia.`,
    browseAll: 'Przeglądaj wszystkich streamerów',
  },
  related: {
    heading: 'Podobni streamerzy',
    liveNowSr: '(teraz na żywo)',
  },
  games: {
    heading: 'Gry',
    navAria: 'Gry, w które gra ten streamer',
  },
};
