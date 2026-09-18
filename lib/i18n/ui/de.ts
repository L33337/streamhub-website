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
    showMore: 'Mehr anzeigen',
    showLess: 'Weniger anzeigen',
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
  streamerRankings: {
    heading: 'Platzierungen',
    intro: (name) => `Wo ${name} in unseren Streamer-Rankings steht.`,
    ofTotal: (total) => `von ${total}`,
    metric: {
      'most-followed': 'Meiste Follower',
      'most-watched': 'Meiste Zuschauer',
      'most-active': 'Aktivste',
      'most-reliable': 'Pünktlichste',
      'fastest-growing': 'Am schnellsten wachsend',
    },
    rowAria: (rank, total, label) => `Platz ${rank} von ${total} bei ${label}`,
    trendUp: (p) => `${p} ${p === 1 ? 'Platz' : 'Plätze'} gestiegen seit letzter Woche`,
    trendDown: (p) => `${p} ${p === 1 ? 'Platz' : 'Plätze'} gefallen seit letzter Woche`,
    byCategory: 'Nach Kategorie',
    summary: (name, parts) => `${name} steht bei Streamer Times auf ${parts.join(' und ')}.`,
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
    tzToggleYour: 'Deine Zeit',
    tzToggleAria: 'Zeiten anzeigen in',
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
  wiki: {
    teaserTitle: 'Wiki & Fakten',
    teaserSub: (name) => `Alter, Vermögen, Karriere: das Wiki-Profil von ${name}`,
    breadcrumb: 'Wiki',
    heading: (name) => `${name} Wiki`,
    metaTitle: (name, year, parts) => `${name} Wiki ${year}: ${parts}`,
    titlePart: {
      age: 'Alter',
      netWorth: 'Vermögen',
      earnings: 'Einkommen',
      realName: 'Bürgerlicher Name',
      career: 'Karriere',
      facts: 'Fakten',
    },
    titleSep: ', ',
    titleAnd: ' & ',
    updated: (date) => `Aktualisiert am ${date}`,
    factsHeading: 'Fakten im Überblick',
    factLabel: {
      real_name: 'Bürgerlicher Name',
      birth_date: 'Geboren',
      birthplace: 'Geburtsort',
      residence: 'Wohnort',
      nationality: 'Nationalität',
      relationship_status: 'Beziehungsstatus',
      net_worth_usd: 'Vermögen (geschätzt)',
      est_income_monthly_usd: 'Monatl. Einkommen (geschätzt)',
      career_start: 'Streamt seit',
      teams: 'Teams & Orgs',
      height_cm: 'Größe',
    },
    relationship: {
      single: 'Single',
      in_relationship: 'In einer Beziehung',
      engaged: 'Verlobt',
      married: 'Verheiratet',
      divorced: 'Geschieden',
      widowed: 'Verwitwet',
    },
    ageSuffix: (age) => `${age} Jahre`,
    estimate: 'Schätzung',
    asOf: (when) => `Stand ${when}`,
    sectionCareer: 'Karriere',
    sectionPersonalLife: 'Privatleben',
    sectionEarnings: 'Einnahmen & Vermögen',
    sectionContentStyle: 'Content & Stil',
    sectionCommunity: 'Community',
    sectionAwards: 'Auszeichnungen & Rekorde',
    timelineHeading: 'Zeitleiste',
    linksLabel: 'Offizielle Links',
    aboutHeading: (name) => `Über ${name}`,
    nextStreamHeading: 'Nächster Stream',
    fullSchedule: (name) => `Kompletter Sendeplan von ${name}`,
    sourcesHeading: 'Quellen',
    minorNote: 'Für Streamer unter 18 veröffentlichen wir ausschließlich Karriere-Informationen.',
    disclaimerHeading: 'Über diese Seite',
    disclaimer: (name) =>
      `Dieses Wiki-Profil wurde aus öffentlich zugänglichen Quellen zusammengestellt. Zahlen wie Vermögen und Einkommen sind Schätzungen Dritter, keine verifizierten Werte; persönliche Angaben entsprechen dem, was ${name} oder etablierte Medien öffentlich gemacht haben.`,
    disclaimerContact:
      'Du bist dieser Streamer und möchtest etwas korrigieren oder entfernen lassen? Schreib uns:',
    earningsFallback: (name, range, asOf) =>
      `Streamer Times schätzt das Einkommen von ${name} auf ${range} pro Monat${asOf ? ` (Stand ${asOf})` : ''}, berechnet aus gemessenen Zuschauerzahlen und Sendestunden.`,
    earningsMethodology: 'So entsteht diese Schätzung',
    numbersHeading: 'In Zahlen',
    numbersNote: (days) =>
      `Zuschauer-Mediane stammen aus stündlichen Messungen während des Streams; die Aktivität bezieht sich auf die letzten ${days} Tage.`,
    numberLabel: {
      medianViewers: 'Zuschauer (Median)',
      streamsPerWeek: 'Streams pro Woche',
      activeDays: 'Aktive Tage pro Woche',
      typicalLength: 'Typische Streamlänge',
      followerGain30: 'Neue Follower, 30 Tage',
    },
    streamTimesHeading: (name) => `Wann streamt ${name}?`,
    reliabilityLabel: 'Zuverlässigkeit des Sendeplans',
    reliabilityTier: { reliable: 'Zuverlässig', medium: 'Mittel', unreliable: 'Unzuverlässig' },
    charts: {
      weekdayHeading: 'Zuschauer-Median nach Wochentag',
      weekdayNote: 'Tage folgen dem UTC-Kalender.',
      hourHeading: 'Zuschauer-Median nach Uhrzeit',
      tzGroupAria: 'Zeitzone des Stunden-Charts',
      yourTime: 'Deine Zeit',
      streamerTime: 'Streamer-Zeit',
      streamerTimeNote: "Ortszeit des Streamers ({tz}).",
      yourTimeNote: 'Deine Ortszeit.',
      utcNote: 'UTC.',
      legendCold: 'Wenig',
      legendPrime: 'Prime Time',
      legendFaded: 'blass = wenige Messungen',
      weekdayAria: 'Median gleichzeitiger Zuschauer nach Wochentag',
      hourAria: 'Median gleichzeitiger Zuschauer nach Tageszeit',
      tooltip: "{label} · Median {median} Zuschauer ({samples} Messungen)",
      noData: "{label} · keine Daten",
      followersNow: 'jetzt',
      followersLow: 'Tief',
      followerAria: "Follower-Zahl von {from} bis {to}",
    },
    gamesNote: (days) => `Anteil an den kategorisierten Streams der letzten ${days} Tage.`,
    gamesColGame: 'Spiel',
    gamesColShare: 'Anteil',
    gamesColStreams: 'Streams',
    gamesColRank: 'Rang',
    clipsHeading: 'Bemerkenswerte Momente',
    clipsIntro: (name) => `Die meistgesehenen Clips aus den Streams von ${name}.`,
    clipViews: (views) => `${views} Aufrufe`,
    clipAria: (title) => `Clip „${title}“ auf Twitch ansehen`,
    recapsHeading: 'In den Recaps',
    recapsIntro: (name) =>
      `Ausgaben unserer Wochen- und Monatsrückblicke, in denen ${name} zu den Hauptfiguren gehörte.`,
    historyHeading: 'Verlauf',
    historyNote:
      'Monat für Monat, wie wir es gemessen haben: Streams, Stunden, Top-Spiel und Publikum. Monate mit einer auffälligen Veränderung bekommen eine kurze Zusammenfassung.',
    historyColMonth: 'Monat',
    historyColStreams: 'Streams',
    historyColHours: 'Stunden',
    historyColTopGame: 'Top-Spiel',
    historyColFollowers: 'Follower',
    historyColViewers: 'Median-Zuschauer',
    historyShowYear: (year) => `${year} anzeigen`,
    changesHeading: 'Änderungen',
    changeAdded: (label, value) => `${label} hinzugefügt: ${value}`,
    changeChanged: (label, from, to) => `${label} geändert von ${from} zu ${to}`,
    changeRemoved: (label) => `${label} entfernt`,
    changeIncomeRefreshed: (from, to) => `Geschätztes Monatseinkommen aktualisiert von ${from} auf ${to}`,
    changeIncomeRemoved: 'Geschätztes Monatseinkommen entfernt (zu wenig Daten)',
    changeSections: (sections) => `Abschnitte neu geschrieben: ${sections}`,
    sectionSummary: 'Einleitung',
  },
};
