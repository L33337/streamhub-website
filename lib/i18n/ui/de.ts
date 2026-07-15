import type { UiLex } from '../types';

// German — du-Form (Streaming-Publikum). "von {name}" statt Genitiv-s, damit
// Namen auf s/x/z nicht brechen (gleiche Konvention wie META_STRINGS.de).
export const de: UiLex = {
  breadcrumb: {
    home: 'Startseite',
    streamers: 'Streamer',
  },
  hero: {
    featured: 'Empfohlen',
    nowStreaming: 'Streamt gerade:',
    avatarAlt: (name) => `Avatar von ${name}`,
  },
  promo: {
    valueProps: [
      'Speichere deine Lieblingsstreamer',
      'Werde benachrichtigt, sobald sie live gehen',
      'Füge jeden Streamer in Sekunden hinzu',
    ],
    qrAria: 'QR-Code — mit dem Handy scannen und die Streamer-Times-App holen',
    getApp: 'Hol dir die App',
  },
  lastStream: {
    heading: 'Letzter Stream',
    pastStream: 'Vergangener Stream',
    watchVod: 'VOD ansehen →',
    watchAria: (name, title) => `Letzten Stream von ${name} ansehen: ${title}`,
  },
  recent: {
    heading: 'Frühere Streams',
    vodAria: (title) => `VOD ansehen: ${title}`,
  },
  channelStats: {
    heading: 'Kanal-Statistiken',
    followers: 'Follower',
    subscribers: 'Abonnenten',
    avgViewers: 'Ø Zuschauer',
    medianDetail: '28-Tage-Median',
    peakViewers: 'Zuschauer-Rekord',
    hoursStreamed: 'Gestreamte Stunden',
    lastNDays: (n) => `letzte ${n} Tage`,
  },
  stats: {
    heading: (name) => `Wann streamt ${name}?`,
    caption: (name, tz) =>
      `Typische Stream-Zeiten von ${name} nach Wochentag, angezeigt in ${tz}`,
    colDay: 'Tag',
    colTime: 'Typische Zeit',
    colDuration: 'Dauer',
    usuallyNoStream: 'Meist kein Stream',
    streamsPerWeek: 'Streams pro Woche',
    typicalLength: 'Typische Stream-Länge',
    topCategories: 'Meistgestreamte Kategorien',
    basedOn: (n, d) => `Basierend auf ${n} Streams der letzten ${d} Tage.`,
    allTimesIn: (tz) => `Alle Zeiten in ${tz}`,
    cityTime: (city) => `Ortszeit ${city}`,
    leadSentence: (name, days, times) => {
      const dayPhrase = days === 1 ? 'einem Tag' : `${days} Tagen`;
      const base = `${name} streamt normalerweise an ${dayPhrase} pro Woche`;
      return times
        ? `${base}, meist zwischen ${times.start} und ${times.end} Uhr (${times.tzLabel}).`
        : `${base}.`;
    },
  },
  faq: {
    heading: 'Häufige Fragen',
    qIsLive: (name) => `Ist ${name} gerade live?`,
    aIsLiveCat: (name, cat, platforms) =>
      `Ja — ${name} ist gerade live und streamt ${cat} auf ${platforms}.`,
    aIsLive: (name, platforms) => `Ja — ${name} ist gerade live auf ${platforms}.`,
    qUsually: (name) => `Wann streamt ${name} normalerweise?`,
    typicallyLast: (duration) => `Die Streams dauern typischerweise etwa ${duration}.`,
    qSchedule: (name) => `Wie sieht der Stream-Plan von ${name} aus?`,
    aScheduleLead: (name, n) =>
      n === 1
        ? `${name} hat in den nächsten 7 Tagen 1 Stream auf dem Plan.`
        : `${name} hat in den nächsten 7 Tagen ${n} Streams auf dem Plan.`,
    nextUp: (entry) => `Als Nächstes: ${entry}.`,
    afterThat: (list) => `Danach: ${list}.`,
    plusMore: (n) =>
      n === 1
        ? `Plus 1 weiterer — siehe den vollständigen Plan oben.`
        : `Plus ${n} weitere — siehe den vollständigen Plan oben.`,
    allTimesNote: (tz) => `Alle Zeiten in ${tz}.`,
    predictedNote:
      'Als Prognose markierte Zeiten werden von KI aus früheren Stream-Mustern geschätzt.',
    outsideDates: (name, time, tz) =>
      `Außerhalb dieser Termine geht ${name} typischerweise gegen ${time} Uhr (${tz}) live — siehe die typischen Stream-Zeiten oben.`,
    predictedMarker: 'prognostiziert',
    qGames: (name) => `Welche Spiele streamt ${name}?`,
    aGamesOne: (name, cat) =>
      `${name} streamt aktuell ${cat}. Im Plan oben findest du die kommenden Streams.`,
    aGamesMany: (name, list) =>
      `${name} streamt ${list}. Im Plan oben siehst du, was als Nächstes kommt.`,
    qHowOften: (name) => `Wie oft streamt ${name}?`,
    aAlwaysOn: (name, platforms) =>
      `${name} streamt rund um die Uhr — der Kanal ist auf ${platforms} durchgehend live.`,
    aPerWeek: (name, perWeek, windowDays) =>
      // Dezimalwerte (z.B. 3.5) mit deutschem Komma: "etwa 3,5-mal pro Woche".
      `${name} streamt im Schnitt etwa ${String(perWeek).replace('.', ',')}-mal pro Woche, basierend auf den Übertragungen der letzten ${windowDays} Tage.`,
    aScheduleCount: (name, n, daysList) => {
      const base =
        n === 1
          ? `${name} hat in den nächsten 7 Tagen 1 Stream auf dem Plan`
          : `${name} hat in den nächsten 7 Tagen ${n} Streams auf dem Plan`;
      return daysList ? `${base}, und zwar am ${daysList}.` : `${base}.`;
    },
    qWhere: (name) => `Wo kann ich ${name} anschauen?`,
    aWhere: (name, platforms) =>
      `${name} streamt live auf ${platforms}. Füge ${name} bei Streamer Times hinzu, um Live-Status und kommende Streams an einem Ort zu verfolgen.`,
    qTimezone: (name) => `In welcher Zeitzone streamt ${name}?`,
    aTimezone: (name, tzCity) =>
      `${name} ist in der Zeitzone ${tzCity} zu Hause. Der Plan auf dieser Seite zeigt jeden Stream in deiner Zeit und in der Ortszeit von ${name}.`,
    qPredicted: (name) => `Sind die Stream-Zeiten von ${name} prognostiziert oder bestätigt?`,
    aAllPredicted: (name) =>
      `Die kommenden Stream-Zeiten von ${name} sind KI-Prognosen auf Basis früherer Stream-Muster, jeweils mit hoher, mittlerer oder niedriger Wahrscheinlichkeit. Bestätigte Zeiten erscheinen hier, sobald sie angekündigt sind.`,
    aMixed: (name, predicted, total) =>
      `Der Plan von ${name} mischt KI-Prognosen mit bestätigten Streams. ${predicted} der ${total} kommenden Zeiten ${predicted === 1 ? 'ist' : 'sind'} aus früheren Stream-Mustern prognostiziert und mit einer Wahrscheinlichkeit versehen.`,
  },
  empty: {
    heading: 'Keine kommenden Streams geplant',
    body: (name, platforms) =>
      `Wir verfolgen die Livestreams von ${name} auf ${platforms}. KI-Prognosen und bestätigte Stream-Zeiten erscheinen hier, sobald wir genug vergangene Streams erfasst haben.`,
    browseAll: 'Alle Streamer durchstöbern',
  },
  related: {
    heading: 'Ähnliche Streamer',
    liveNowSr: '(gerade live)',
  },
  games: {
    heading: 'Spiele',
    navAria: 'Spiele, die dieser Streamer spielt',
  },
};
