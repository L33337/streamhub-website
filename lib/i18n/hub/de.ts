import { formatCompactNumber } from '@/lib/format/number';
import { listConjunction } from '@/lib/i18n-core';
import type { HubLex } from './types';

export const de: HubLex = {
  crumbs: {
    aria: 'Seitenpfad',
    home: 'Startseite',
    liveNow: 'Jetzt live',
    tonight: 'Heute Abend',
    games: 'Spiele',
    streamers: 'Streamer',
    rankings: 'Rankings',
    pageN: (n) => `Seite ${n}`,
  },
  common: {
    browseStreamersAZ: 'Alle Streamer von A–Z',
    allGamesCategories: 'Alle Spiele & Kategorien',
  },
  home: {
    browseAllGames: 'Alle Spiele & Kategorien entdecken →',
    seeLiveNow: 'Sieh, wer gerade live ist →',
    qrTitle: 'Zum Download scannen — Streamer Times',
    qrHeading: 'Zum Download scannen',
    qrHint: 'Handykamera hierhin halten',
  },
  homeFeed: {
    ticker: (liveCount, soonCount, soonHours) => {
      const live = liveCount > 0 ? `${liveCount} Streamer gerade live` : '';
      const soon =
        soonCount > 0
          ? `${soonCount} starten in den nächsten ${soonHours} Stunden`
          : '';
      return live && soon ? `${live} · ${soon}` : live || soon;
    },
    liveTitle: 'Gerade am meisten gesehen',
    liveFilterCategory: 'Kategorie',
    liveFilterLanguage: 'Sprache',
    liveFilterAllCategories: 'Alle Kategorien',
    liveFilterAllLanguages: 'Alle Sprachen',
    liveFilterOption: (label, count) => `${label} (${count})`,
    liveFilterMatches: (count) => `${count} Streams live`,
    liveFilterReset: 'Zurücksetzen',
    liveFilterEmpty: 'Zu dieser Auswahl läuft gerade kein Stream.',
    liveFilterNote: (top, total) =>
      `Top ${top} nach aktuellen Zuschauern – Filter durchsuchen alle ${total} Live-Streams`,
    upNextTitle: 'Heute im Programm',
    upNextLink: 'Live & demnächst →',
    upNextTonightLink: 'Das ganze Abendprogramm →',
    lineupFilterTime: 'Zeit',
    lineupFilterAllTimes: 'Jederzeit',
    lineupFilterFrom: (time) => `Ab ${time}`,
    lineupFilterMatches: (count) => `${count} ${count === 1 ? 'Stream' : 'Streams'}`,
    lineupFilterEmpty: 'Zu dieser Auswahl ist kein Stream angekündigt.',
    chipAll: 'Alle',
    chipFavorites: 'Meine Favoriten',
    lineupShowAll: (n) => `Alle ${n} Streams anzeigen`,
    lineupShowMore: (n) => `${n} weitere anzeigen`,
    lineupShowLess: 'Weniger anzeigen',
    bellAria: (name) => `Benachrichtigung, wenn ${name} live geht`,
    upsell: {
      bellTitle: 'Verpasse keinen Stream mehr',
      bellBody:
        'Bekomm eine Push-Nachricht, kurz bevor ein Stream startet — mit der kostenlosen Streamer-Times-App.',
      favoritesTitle: 'Deine Favoriten, einen Tipp entfernt',
      favoritesBody:
        'Folge Streamern und filtere diese Seite auf dein eigenes Programm — kostenlos, in der App oder direkt hier im Browser.',
      appCta: 'App holen',
      loginCta: 'Kostenlos anmelden',
      close: 'Vielleicht später',
    },
    interrupt: {
      title: 'Diese Seite — nur mit deinen Streamern.',
      body: 'Folge deinen Streamern und aus dem Guide wird dein persönlicher Feed: dein Programm, Push-Alarm kurz vor Stream-Start und ihre Highlights der Woche.',
      note: 'Dauert 30 Sekunden · kostenlos',
      appCta: 'App holen',
      loginCta: 'Im Browser anmelden',
    },
    clipsTitle: 'Clips der Woche',
    clipsFilterMatches: (count) => `${count} ${count === 1 ? 'Clip' : 'Clips'}`,
    clipsFilterEmpty: 'Zu dieser Auswahl gibt es keinen Clip.',
    quickFactsTitle: 'Quick Facts',
    quickFactsSub: 'Zahlen aus den Streams, die wir erfassen',
    factPredictionLabel: 'Prognose-Check',
    factPrediction: (hits, total) =>
      `${hits} von ${total} Prognosen mit hoher Wahrscheinlichkeit trafen das Zwei-Stunden-Fenster um die vorhergesagte Startzeit.`,
    factPeakLabel: 'Peak der Woche',
    factPeak: (name) =>
      `${name} erreichte diese Woche die meisten gleichzeitigen Zuschauer.`,
    factReliableLabel: 'Auf die Minute',
    factReliable: (name, hits, total) =>
      `${name} startete ${hits} von ${total} zuletzt angekündigten Streams pünktlich.`,
    factPauseLabel: 'In der Pause',
    factPause: (name) => `${name} macht bis zu diesem Datum Pause.`,
    factMarathonLabel: 'Marathon der Woche',
    factMarathon: (name) => `So lange war ${name} am Stück live.`,
    factComebackLabel: 'Comeback der Woche',
    factComeback: (name, days) => `${name} ist nach ${days} Tagen ohne Stream zurück.`,
    factPrimeTimeLabel: 'Prime Time',
    factPrimeTime: (total) =>
      `Zu dieser Stunde starten mehr Streams als zu jeder anderen — aus ${total} Streams in 4 Wochen.`,
    factBusiestDayLabel: 'Vollster Tag',
    factBusiestDay: (total) =>
      `An diesem Wochentag starten die meisten Streams — aus ${total} Streams in 4 Wochen.`,
    factLocalTimeNote: 'deine Zeitzone',
    factUtcNote: 'UTC',
    factTopCategoryLabel: 'Kategorie der Woche',
    factTopCategory: (category, streamers) =>
      `Streams in ${category} in den letzten 7 Tagen, von ${streamers} ${streamers === 1 ? 'Streamer' : 'Streamern'}.`,
    factCompetitionLabel: 'Konkurrenz-Level',
    factCompetition: (category) =>
      `So viele erfasste Kanäle sind in ${category} im Schnitt gleichzeitig live — die vollste Kategorie bei uns.`,
    factRoomLabel: 'Freie Nische',
    factRoom: (category, channels) =>
      `Zuschauer je Kanal in ${category} — bei nur ${channels} erfassten Kanälen gleichzeitig live.`,
    factRoomSlotLabel: 'Beste Zeit',
    risersTitle: 'Aufsteiger der Woche',
    risersLink: 'Alle Rankings →',
    risersGained: (delta) => `${delta} Follower in 7 Tagen`,
    mostStreamedTitle: 'Meistgestreamt diese Woche',
    weekHours: (value) => `${value} Std. live · 7 Tage`,
    weekStreams: (n) => `${n} ${n === 1 ? 'Stream' : 'Streams'}`,
    mostWatchedTitle: 'Meistgesehen',
    topStreamersCol: 'Top-5 Streamer',
    topCategoriesCol: 'Top-5 Kategorien',
    medianViewers: (value) => `${value} Zuschauer im Median`,
    hoursStreamed: (value) => `${value} Std. live · 28 Tage`,
    followers: (value) => `${value} Follower`,
    missingStreamer: 'Dein Streamer fehlt? Suchen & hinzufügen →',
    endcap: {
      title: 'Nimm dein Programm mit.',
      bullets: [
        'Folge deinen Lieblingsstreamern',
        'Sieh, wer wann live geht',
        'Stats, Highlights und mehr!',
      ],
      webLead: 'Lieber im Browser?',
      webLink: 'Erstell ein kostenloses Konto',
      webTail: '— dein Feed wartet.',
    },
    sessionBanner: {
      text: 'Willkommen zurück — dein persönlicher Feed ist bereit.',
      cta: 'Zu meinem Feed →',
    },
    sectionNav: {
      aria: 'Zu einem Abschnitt springen',
      live: 'Live',
      lineup: 'Heute',
      trending: 'Trending',
      clips: 'Clips',
      stats: 'Zahlen',
      discover: 'Streamer',
    },
  },
  hero: {
    claim: 'Sendeplan. Highlights. Statistiken. Alles an einem Ort.',
    ctaLogin: 'Melde dich an',
    ctaMid: ' oder ',
    ctaApp: 'hol dir die App',
    ctaTail: ', um deinen Lieblings-Streamern zu folgen.',
    ctaAppOnlyLink: 'Hol dir die App',
    ctaAppOnlyTail: ', um deinen Lieblings-Streamern zu folgen.',
    kicker: 'Live-Streamer-Guide',
    badgeNew: 'Neu',
    badgeLive: 'Jetzt für iOS & Android',
    titleLead: 'Der Live-Sendeplan für ',
    titleTail: '',
    subtitle: 'Der TV-Guide für Streamer.',
    bodyLead:
      'Ein Feed für Twitch und YouTube. Live-Status in Echtzeit, KI-Vorhersagen für die nächsten Streams und null Lärm. Kostenlos, ohne Konto —',
    bodyLink: 'hol dir die App',
    bodyTail: 'für Live-Benachrichtigungen.',
    appStoreSub: 'Laden im',
    playSub: 'JETZT BEI',
    phoneAlt: 'Eine Streamerin schaut sich das heutige Programm auf ihrem Handy an',
    phoneCaption: 'Das heutige Line-up checken',
    statBothLabel: 'Beide Plattformen, ein Guide',
    statFavoritesValue: 'Deine Favoriten',
    statFavoritesLabel: 'Füge jeden Kanal in Sekunden hinzu',
    statApiValue: 'Öffentliche API',
    statApiLabel: 'Bald verfügbar · trag dich auf die Warteliste ein',
  },
  upcoming: {
    heading: 'Als Nächstes',
    aria: 'Kommende Streams',
    empty: 'Gerade ist nichts geplant — schau bald wieder vorbei.',
  },
  trending: {
    heading: 'Angesagt auf Twitch',
    subtitle:
      'Was ganz Twitch gerade schaut.',
    aria: 'Angesagte Spiele auf Twitch',
    rankOnTwitch: (rank) => `#${rank} auf Twitch`,
    sortAria: 'Spiele sortieren',
    sortTwitch: 'Twitch-Rang',
    sortHours: 'Stunden',
    sortViewers: 'Zuschauer',
    sortStreamers: 'Streamer',
    liveViewers: (value) => `${value} schauen gerade zu`,
    streamerCount: (value) => `${value} Streamer`,
  },
  popular: {
    heading: 'Beliebte Streamer',
    viewAll: 'Alle Streamer ansehen →',
  },
  streamerWiki: {
    heading: 'Streamer Wiki',
    subline: 'Wer sie sind, was sie spielen und wann sie live gehen.',
    viewAll: 'Alle Streamer durchsuchen →',
    followers: (value) => `≈${value} Follower`,
    streams28d: (count) => `${count} ${count === 1 ? 'Stream' : 'Streams'} in 28 Tagen`,
    liveNow: 'Jetzt live',
    nextPrefix: 'Nächster',
  },
  apiPromo: {
    heading: 'Entwickler-API',
    comingSoon: 'Bald verfügbar',
    eyebrow: 'Für Entwickler',
    headlineLead: 'Bau mit denselben Daten —',
    headlineKey: 'bald über unsere API.',
    body: 'Wir arbeiten gerade mit den ersten Pilotpartnern. Trag dich auf die Warteliste ein und wir schreiben dir, sobald der öffentliche Zugang startet — inklusive Gratis-Stufe für Indie-Entwickler.',
    bullets: [
      'Live-Status & Zuschauerzahlen in Echtzeit',
      'KI-Vorhersagen für kommende Streams mit Konfidenz',
      'Webhooks für „ist live gegangen“-Events',
      'OpenAPI-Spezifikation inklusive',
    ],
    cta: 'Auf die Warteliste',
  },
  live: {
    h1: 'Jetzt live auf Twitch & YouTube',
    intro: (liveCount, categoryCount, soonCount, soonHours = 6) =>
      `${liveCount} Streamer ${liveCount === 1 ? 'ist' : 'sind'} gerade live` +
      (categoryCount > 0
        ? ` in ${categoryCount} ${categoryCount === 1 ? 'Spiel bzw. Kategorie' : 'Spielen und Kategorien'}`
        : '') +
      '.' +
      (soonCount > 0
        ? ` ${soonCount} ${soonCount === 1 ? 'weiterer startet' : 'weitere starten'} laut Plan in den nächsten ${soonHours} Stunden.`
        : ''),
    introEmpty: 'Gerade ist niemand live — hier siehst du, wer bald startet.',
    error: 'Der Live-Status ist gerade nicht verfügbar. Versuch es gleich noch einmal.',
    otherCategory: 'Sonstiges',
    categoryLiveAria: (name) => `${name} — jetzt live`,
    nLive: (n) => `${n} live`,
    jumpToGame: 'Zu einem Spiel springen',
    startingSoon: 'Startet bald',
    nextNHours: (n) => `nächste ${n} Stunden`,
    emptyAll:
      'Gerade ist nichts live und nichts startet in Kürze. Stöbere durch das komplette Streamer-Verzeichnis oder entdecke Spiele für deinen nächsten Stream.',
    itemListName: 'Streamer, die gerade auf Twitch & YouTube live sind',
  },
  tonight: {
    h1: 'Wer streamt heute Abend?',
    h1Night: 'Wer heute Nacht noch streamt',
    intro: (total, names) =>
      `Für heute Abend ${total === 1 ? `ist ${total} Stream` : `sind ${total} Streams`} auf Twitch und YouTube geplant` +
      (names ? `, unter anderem mit ${names}` : '') +
      '.',
    introEmpty:
      'Für heute Abend ist noch nichts geplant. Die Prognosen füllen sich im Lauf des Tages, sobald Streamer ihre laufenden Sendungen beenden.',
    timesInZone: (zone) => `Alle Zeiten ${zone}`,
    timesLocal: 'Alle Zeiten in deiner Zeitzone',
    error: 'Das Programm für heute Abend ist gerade nicht verfügbar. Versuch es gleich noch einmal.',
    jumpAria: 'Zu einer Uhrzeit des Abends springen',
    liveNowHeading: 'Schon live',
    liveNowLink: 'Alle sehen, die jetzt live sind',
    primetimeHeading: 'Highlights des Abends',
    primetimeSub: (time) => `Die größten Namen, die gegen ${time} live gehen.`,
    blockFrom: (time) => `Ab ${time}`,
    blockNight: 'Nachtprogramm',
    blockCount: (n) => `${n} Stream${n === 1 ? '' : 's'}`,
    quietBody:
      'Schau später noch mal vorbei oder sieh, wer gerade live ist — ab 18 Uhr füllt sich der Abend meistens.',
    aboutHeading: 'Über den Abend-Guide',
    aboutBody:
      'Diese Seite ist die Abendansicht von Streamer Times: jeder Twitch- und YouTube-Stream, den wir zwischen 18 und 6 Uhr erwarten, nach Startzeit gruppiert — damit du deinen Abend so planen kannst wie mit einer Fernsehzeitschrift.',
    faqWhatQ: 'Was läuft heute Abend?',
    faqWhatA:
      'Die Blöcke oben listen jeden Stream, der für diesen Abend angekündigt oder prognostiziert ist, der früheste zuerst. Angekündigte Streams kommen direkt aus dem Sendeplan des Streamers; der Rest wird aus der Stream-Historie vorhergesagt, mit einem Konfidenz-Badge auf jeder Karte.',
    faqHowQ: 'Woher wisst ihr, wann jemand streamt?',
    faqHowA:
      'Wir verfolgen die Sendehistorie jedes Kanals und seine Ankündigungen und sagen daraus den nächsten Start voraus. Hohe Konfidenz heißt: ein starkes, regelmäßiges Muster oder ein angekündigter Termin; niedrige Konfidenz heißt, dass der Plan zuletzt unregelmäßig war.',
    faqTimesQ: 'In welcher Zeitzone sind die Zeiten?',
    faqTimesA: (zone) =>
      `Die Zeiten stehen in ${zone} und wechseln in deine eigene Zeitzone, sobald die Seite geladen ist. Der Abend läuft von 18 bis 6 Uhr — ein Stream, der nach Mitternacht startet, gehört also noch zu heute Abend.`,
    itemListName: 'Streams heute Abend auf Twitch & YouTube',
  },
  streamers: {
    h1: 'Alle Twitch- & YouTube-Streamer von A–Z',
    intro:
      'Jeder Streamer auf Streamer Times — sieh, wer gerade live ist und was als Nächstes gestreamt wird. Blättere Seite für Seite durch die komplette Liste.',
    pageOf: (page, totalPages) => `Seite ${page} von ${totalPages}.`,
    error: 'Die Streamer sind gerade nicht verfügbar. Versuch es gleich noch einmal.',
    paginationAria: 'Seitennavigation',
    prev: '← Zurück',
    next: 'Weiter →',
  },
  games: {
    liveRightNow: 'Gerade live',
    liveAria: 'Spiele mit laufenden Streams',
    error: 'Die Spiele sind gerade nicht verfügbar. Versuch es gleich noch einmal.',
    aboutHeading: 'Über diese Spiele',
    updatedAt: (stamp) => `Aktualisiert um ${stamp}.`,
    relatedAria: 'Verwandte Seiten',
  },
  gamesRoot: {
    h1: 'Die beliebtesten Spiele auf Twitch & YouTube',
    methodologyNote:
      'Sortiert danach, wie viele Streamer wir in den letzten 28 Tagen in jeder Kategorie erfasst haben.',
    intro: (gameCount, liveStreamerCount, liveGameCount) => {
      const lead = `Wir erfassen ${gameCount} ${gameCount === 1 ? 'Spiel' : 'Spiele'} und Kategorien auf Twitch und YouTube.`;
      const note =
        'Sortiert danach, wie viele Streamer wir in den letzten 28 Tagen in jeder Kategorie erfasst haben.';
      if (liveStreamerCount <= 0) return `${lead} ${note}`;
      const streamers = `${formatCompactNumber(liveStreamerCount, 'de')} Streamer ${liveStreamerCount === 1 ? 'ist' : 'sind'} gerade live`;
      const across =
        liveGameCount > 0
          ? ` in ${liveGameCount} ${liveGameCount === 1 ? 'Kategorie' : 'Kategorien'}`
          : '';
      return `${lead} ${streamers}${across}. ${note}`;
    },
    faqPopularQ: 'Was ist das beliebteste Spiel auf Twitch und YouTube?',
    faqPopularA: (top, second) =>
      `${top.category} hat die meisten von uns erfassten Streamer — ${top.count} ${top.count === 1 ? 'Kanal hat' : 'Kanäle haben'} es in den letzten 28 Tagen gestreamt${second ? `, vor ${second.category} mit ${second.count}` : ''}.`,
    faqWhoQ: 'Wer streamt gerade?',
    faqWhoA: (liveStreamerCount, liveGameCount) =>
      `${liveStreamerCount} Streamer ${liveStreamerCount === 1 ? 'ist' : 'sind'} live in ${liveGameCount} ${liveGameCount === 1 ? 'Kategorie' : 'Kategorien'}. Öffne eine Kategorie, um die Live-Kanäle und ihre kommenden Streams zu sehen.`,
    faqRankedQ: 'Wie werden diese Spiele gerankt?',
    faqRankedA: (gameCount) =>
      `Sortiert danach, wie viele Streamer wir in den letzten 28 Tagen in jeder Kategorie erfasst haben. Die Zahlen stammen aus einer nächtlichen Auswertung abgeschlossener Streams über ${gameCount} ${gameCount === 1 ? 'Spiel' : 'Spiele'} hinweg; Live-Zahlen aktualisieren sich alle paar Minuten.`,
    faqHoursQ: 'Bedeutet „Stunden gestreamt“ Watchtime?',
    faqHoursA:
      'Nein. „Stunden gestreamt“ misst, wie lange Streamer in einer Kategorie live waren. Zuschauer-Watchtime erfassen wir nicht; die Live-Zuschauerzahlen auf den Karten sind eine Momentaufnahme, keine Summe.',
  },
  rankings: {
    h1: 'Streamer-Rankings',
    intro: (n) =>
      `Wer sind die größten, am schnellsten wachsenden, fleißigsten und verlässlichsten Streamer auf Twitch und YouTube? ${n} Ranglisten über alle Streamer, die wir erfassen — täglich aktualisiert aus echten Broadcast-Daten.`,
    dataRefreshed: (label) => ` Daten aktualisiert: ${label}.`,
    seeFullRanking: 'Zum kompletten Ranking →',
    warmingUp: 'Die Ranglisten laufen sich noch warm — schau bald wieder vorbei.',
    filterEmpty: 'Zu dieser Auswahl passt kein Streamer in diesem Ranking.',
    filterError: 'Das gefilterte Ranking konnte nicht geladen werden.',
    filterRetry: 'Nochmal versuchen',
    byGameHeading: 'Rankings nach Spiel',
    byGameSubtitle: 'Die meistgefolgten Streamer für jedes Spiel und jede Kategorie.',
    byGameAria: 'Beliebte Spiel-Rankings',
    topGameStreamers: (category) => `Die besten ${category}-Streamer`,
    whoIsLive: 'Wer ist gerade live?',
    climbersThisWeek: 'Größte Aufsteiger der Woche',
    metricH1: {
      'most-followed': 'Streamer mit den meisten Followern',
      'fastest-growing': 'Am schnellsten wachsende Streamer',
      'most-watched': 'Meistgesehene Streamer',
      'most-active': 'Aktivste Streamer',
      'most-reliable': 'Pünktlichste Streamer',
    },
    metricNote: {
      'most-followed':
        'Täglich aktualisiert. Follower- und Abonnentenzahlen werden regelmäßig aufgefrischt und können den Live-Zahlen der Plattformen hinterherhinken.',
      'fastest-growing':
        'Zuwachs an Kanal-Followern (Twitch) bzw. Abonnenten (YouTube) in den letzten 7 Tagen, aus täglichen Snapshots aller erfassten Kanäle. Nur Kanäle mit positivem Wachstum werden gerankt. Täglich aktualisiert.',
      'most-watched':
        'Median der gleichzeitigen Live-Zuschauer über die letzten 28 Tage (stündliche Stichproben). Täglich aktualisiert.',
      'most-active':
        'Gesamte Live-Stunden in den letzten 28 Tagen. Jeder Stream zählt einmal; 24/7-Dauerkanäle sind ausgeschlossen. Täglich aktualisiert.',
      'most-reliable':
        'Anteil der angekündigten Twitch-Streams, die tatsächlich innerhalb von ±30 Minuten gestartet sind, über die letzten 20 angekündigten Streams innerhalb von 90 Tagen (mindestens 10 ausgewertet). Täglich aktualisiert.',
    },
    tableColStreamer: 'Streamer',
    tableColMainGame: 'Hauptspiel',
    tableColNextStream: 'Nächster Stream',
    tableHeaders: {
      'Followers': 'Follower',
      'Avg viewers': 'Ø Zuschauer',
      'Gained (7d)': 'Zuwachs (7 T.)',
      'Growth': 'Wachstum',
      'Followers now': 'Follower jetzt',
      'Hours (28d)': 'Stunden (28 T.)',
      'Streams / week': 'Streams / Woche',
      'Avg duration': 'Ø Dauer',
      'On-time rate': 'Pünktlichkeit',
      'Typical deviation': 'Typische Abweichung',
      'Streams evaluated': 'Bewertete Streams',
    },
    trendNewLabel: 'neu',
    trendNewTitle: 'Vor einer Woche noch nicht in diesem Ranking',
    trendMoveTitle: (up, delta) =>
      `Seit letzter Woche ${delta} ${delta === 1 ? 'Platz' : 'Plätze'} ${up ? 'nach oben' : 'nach unten'}`,
    mainGameShareTitle: (pct) => `${pct} % ihrer kategorisierten Streams`,
    alwaysOnTitle: 'Always-on-Kanal — rund um die Uhr live',
  },
  recaps: {
    weeklyKicker: 'Wochenrückblick',
    monthlyKicker: 'Monatsrückblick',
    readMore: 'Zum ganzen Rückblick',
    archiveTitle: 'Streamer-Rückblick-Archiv',
    archiveIntro:
      'Alle Wochen- und Monatsrückblicke der Rankings: wer geklettert ist, wer am schnellsten wuchs und welche Clips alle gesehen haben.',
    allRecaps: 'Alle Rückblicke',
    backToRankings: 'Alle Rankings',
    previousEdition: 'Vorherige Ausgabe',
    nextEdition: 'Nächste Ausgabe',
    translationPending:
      'Diese Ausgabe ist noch nicht übersetzt — hier das englische Original.',
  },
  gamesExplorer: {
    sectionAria: 'Alle Spiele und Kategorien',
    sortAria: 'Spiele sortieren',
    sortLabels: { streamers: 'Meiste Streamer', hours: 'Meistgestreamt', trending: 'Im Trend' },
    viewTitles: {
      streamers: 'Die beliebtesten Spiele auf Twitch & YouTube',
      hours: 'Die meistgestreamten Spiele auf Twitch & YouTube',
      trending: 'Spiele im Trend auf Twitch & YouTube',
    },
    searchPlaceholder: 'Spiele suchen…',
    searchAria: 'Spiele suchen',
    noMatch: 'Keine Spiele passen zu „{q}“.',
  },
  gameChips: {
    aria: (category) => `${category}-Statistiken`,
    streamersLabel: () => 'Streamer',
    liveNowLabel: 'jetzt live',
    watchingLabel: 'Zuschauer',
    streamedLabel: 'gestreamt · 28 Tage',
    streamsLabel: () => 'Streams · 28 Tage',
    peakLead: 'Peak ',
    peakTail: ' Zuschauer · 28 Tage',
    trendTail: ' diese Woche',
    trendTitle: 'Veränderung aktiver Streamer zur Vorwoche',
  },
  game: {
    notFoundTitle: 'Spiel nicht gefunden — StreamerTimes',
    metaTitle: (category) => `${category}-Streamer — Jetzt live, Rankings & Sendeplan`,
    metaDescription: (category, names) => {
      const tail = `Wer ist jetzt live, kommende Streams und KI-prognostizierte Sendepläne auf Twitch und YouTube.`;
      const namesLead =
        names.length > 0
          ? `${listConjunction(names, 'de')} ${names.length === 1 ? 'führt' : 'führen'} das ${category}-Ranking an. `
          : '';
      const twoNamesLead =
        names.length > 1
          ? `${listConjunction(names.slice(0, 2), 'de')} führen das ${category}-Ranking an. `
          : '';
      return [
        `${namesLead}${tail}`,
        `${twoNamesLead}${tail}`,
        `Die ${category}-Streamer mit den meisten Followern. ${tail}`,
        tail,
      ];
    },
    ogTitle: (category) => `${category}-Streamer — jetzt live, Rankings & Sendeplan`,
    ogDescription: (category, names) => {
      const ogNames =
        names.length > 0 ? ` — ${listConjunction(names, 'de')} —` : ':';
      return `Die ${category}-Streamer mit den meisten Followern${ogNames} Live-Status und Sendeplan auf Twitch und YouTube.`;
    },
    h1: (category) => `${category}-Streamer — jetzt live & Sendeplan`,
    intro: (shown, category, liveCount, upcomingCount, superlative) =>
      `${shown} Streamer ${shown === 1 ? 'hat' : 'haben'} diese Woche ${category}-Streams live oder geplant auf Twitch und YouTube. ` +
      (liveCount > 0
        ? `${liveCount} ${liveCount === 1 ? 'ist' : 'sind'} gerade live`
        : 'Gerade ist keiner live') +
      (upcomingCount > 0
        ? `, dazu ${upcomingCount} ${upcomingCount === 1 ? 'kommender Stream' : 'kommende Streams'} in den nächsten 7 Tagen.`
        : '.') +
      superlative,
    // Klammer statt satzfinalem Wert: das deutsche Kompaktformat endet selbst
    // mit Punkt ("19,2 Mio.") und würde sonst "Mio.." erzeugen.
    superlative: (category, name, value, isTwitch) =>
      ` Die meisten ${isTwitch ? 'Follower' : 'Abonnenten'} hat hier ${name} (${value}).`,
    onPageAria: 'Auf dieser Seite',
    navLiveNow: 'Jetzt live',
    navTopStreamers: 'Top-Streamer',
    navBestTimes: 'Beste Zeiten',
    navSchedule: 'Sendeplan',
    navRelated: 'Ähnliche Spiele',
    followGame: (category) => `${category} folgen`,
    followingLabel: 'Folge ich',
    watchingNow: (category) => `Jetzt live: ${category}`,
    liveStreamsAria: (category) => `Live-Streams in ${category}`,
    moreLiveAria: (category) => `Weitere Live-Streams in ${category}`,
    showMoreLive: (n) =>
      n === 1 ? '1 weiteren Live-Kanal anzeigen' : `${n} weitere Live-Kanäle anzeigen`,
    moreLiveInRanking: (n, category) =>
      `${n} weitere live im kompletten ${category}-Ranking →`,
    liveUpdatesNote: 'Live-Status und Zuschauerzahlen aktualisieren sich alle paar Minuten.',
    mostFollowed: (category) => `${category}-Streamer mit den meisten Followern`,
    tableCaption: (category) =>
      `${category}-Streamer nach Follower-Zahl, mit ihrem nächsten erwarteten Stream`,
    thRank: '#',
    thStreamer: 'Streamer',
    thNextStream: 'Nächster Stream',
    thFollowers: 'Follower',
    thHours: 'Std. / 28 Tage',
    liveNowCell: 'Jetzt live',
    seeFullRanking: (category) => `Zum kompletten ${category}-Ranking (Top 50) →`,
    whoStreams: (category) => `Streamer, die ${category} streamen`,
    whenStreamed: (category) => `Wann wird ${category} gestreamt?`,
    heatmapSummary: (category) =>
      `Die meisten ${category}-Streams laufen {peak}{tz} — basierend auf den letzten 4 Wochen erfasster Streams.`,
    heatmapSummaryEmpty: 'Basierend auf den letzten 4 Wochen erfasster Streams.',
    tzLocalSuffix: ' (deine Zeit)',
    tzUtcSuffix: ' (UTC)',
    heatmapAria: (category) => `Wöchentliche Streaming-Heatmap für ${category}.`,
    heatmapAriaWithPeak: (category) =>
      `Wöchentliche Streaming-Heatmap für ${category}. Stärkstes Zeitfenster: {peak}.`,
    heatmapTooltip: '{day} {from}–{to} · {amount} gestreamt in 4 Wochen',
    legendLess: 'Wenig',
    legendMore: 'Viel',
    heatmapDayNames: [
      'montags',
      'dienstags',
      'mittwochs',
      'donnerstags',
      'freitags',
      'samstags',
      'sonntags',
    ],
    bestTimeToStream: (category) => `Beste Zeit, um ${category} zu streamen`,
    trendingBadge: '▲ Im Trend',
    bestTimeIntro: (category) =>
      `Für Streamer: die Zeitfenster, in denen ${category} die meisten Zuschauer pro Live-Kanal hat.`,
    fullHeatmapLink: 'Komplette Opportunity-Heatmap & Analyse →',
    bestSlotsAria: 'Beste Zeitfenster',
    viewersPerChannel: '~{score} Zuschauer/Kanal',
    timesLocalNote: 'Zeiten in deiner Zeitzone.',
    timesUtcNote: 'Zeiten in UTC.',
    quietTitle: (category) => `Gerade keine ${category}-Streams`,
    quietBody: (category) =>
      `Keiner der ${category}-Streamer, die wir tracken, ist live oder in den nächsten 7 Tagen zu erwarten. Sendepläne und KI-Prognosen aktualisieren sich mehrmals täglich — schau bald wieder rein.`,
    quietMeanwhile: 'In der Zwischenzeit',
    seeWhosLive: 'Sieh, wer gerade live ist →',
    browseAllGames: 'Alle Spiele durchstöbern',
    gameStreamersChip: (category) => `${category}-Streamer`,
    scheduleAria: (category) => `${category}-Sendeplan`,
    upcomingStreams: (category) => `Kommende ${category}-Streams`,
    scheduleNote:
      'Zeiten passen sich deiner Zeitzone an, die Zeit des Streamers steht daneben. Tage folgen dem UTC-Kalender, deshalb kann ein Stream spät nachts unter dem nächsten Tag stehen.',
    filterAria: 'Sendeplan filtern',
    allPlatforms: 'Alle Plattformen',
    hideLowConfidence: 'Niedrige Wahrscheinlichkeit ausblenden',
    moreLowConfidence: (n) =>
      n === 1
        ? '1 weitere Prognose mit niedriger Wahrscheinlichkeit'
        : `${n} weitere Prognosen mit niedriger Wahrscheinlichkeit`,
    lowConfAria: (label) => `Prognosen mit niedriger Wahrscheinlichkeit: ${label}`,
    hiddenNotShown: (n) =>
      n === 1
        ? '1 weitere Prognose wird für diesen Tag nicht angezeigt. Den vollen Sendeplan findest du auf der Streamer-Seite.'
        : `${n} weitere Prognosen werden für diesen Tag nicht angezeigt. Den vollen Sendeplan findest du auf der Streamer-Seite.`,
    relatedGames: 'Ähnliche Spiele',
    relatedGamesAria: 'Ähnliche Spiele',
    relatedNote: 'Spiele, deren Streamer-Roster sich in den letzten 28 Tagen überschneiden.',
    allGamesFooter: '← Alle Spiele & Kategorien',
  },
  gameRanking: {
    notFoundTitle: 'Nicht gefunden — StreamerTimes',
    metaTitle: (category, page) =>
      page === 1
        ? `Top ${category}-Streamer — nach Followern gerankt`
        : `Top ${category}-Streamer — nach Followern gerankt — Seite ${page}`,
    metaLeadIn: (name, value) => `${name} führt mit ${value} Followern. `,
    metaDescription: (category, leadIn) => [
      `${leadIn}Die Top-${category}-Streamer auf Twitch und YouTube, nach Followern gerankt, mit Live-Status und nächsten Streams. Täglich aktualisiert.`,
      `${leadIn}Die Top-${category}-Streamer nach Followern, mit Live-Status und nächsten Streams.`,
      `Die Top-${category}-Streamer auf Twitch und YouTube, nach Followern gerankt, mit Live-Status und nächsten Streams. Täglich aktualisiert.`,
    ],
    ogTitle: (category) => `Top ${category}-Streamer — nach Followern gerankt`,
    h1: (category) => `Top ${category}-Streamer nach Followern`,
    introPage1: (count, category) =>
      `Die Top ${count} ${category}-Streamer, die wir tracken, gerankt nach Kanal-Followern und Abonnenten.`,
    topsTheList: (name, value, isTwitch) =>
      ` ${name} führt die Liste mit ${value} ${isTwitch ? 'Followern' : 'Abonnenten'} an.`,
    introPageN: (from, to, total, category) =>
      `Plätze ${from}–${to} von ${total} ${category}-Streamern, die wir tracken, gerankt nach Kanal-Followern und Abonnenten.`,
    methodology: (category) =>
      `Streamer, die in den letzten 28 Tagen in ${category} aktiv waren, gerankt nach Followern. Die Zahlen werden regelmäßig aktualisiert und können den Live-Werten der Plattformen hinterherhinken.`,
    followersRefreshed: (label) => ` Follower-Zahlen aktualisiert: ${label}.`,
    warmingUp:
      'Dieses Ranking wärmt sich noch auf — wir brauchen etwas mehr Daten, bevor es aussagekräftig ist. Schau bald wieder rein.',
    missingDataNote:
      '— heißt, dass wir für diesen Kanal noch nicht genug Daten gesammelt haben, zum Beispiel Zuschauer-Stichproben bei frisch hinzugefügten Kanälen.',
    sortAria: 'Ranking sortieren',
    sortFollowers: 'Meiste Follower',
    sortHours: 'Meiste Stunden (28 Tage)',
    sortViewers: 'Meiste Zuschauer',
    filterLangAria: 'Nach Sprache filtern',
    allChip: 'Alle',
    noMatch: 'Keine Streamer passen zu diesem Filter.',
    tableCaption: (category) => `${category}-Streamer nach Follower-Zahl`,
    thRank: '#',
    thStreamer: 'Streamer',
    thFollowers: 'Follower',
    thAvgViewers: 'Ø Zuschauer',
    thHours: 'Std. (28 Tage)',
    thShare: 'Spielanteil',
    thShareTitle: (category) =>
      `Anteil der letzten Streams, die ${category} waren`,
    thNextStream: 'Nächster Stream',
    liveNowCell: 'Jetzt live',
    watchingTail: ' · {value} Zuschauer',
    trendNewBadge: 'neu',
    trendNewTitle: 'Letzte Woche noch nicht in diesem Ranking',
    trendUpTemplate: 'Seit letzter Woche {n} nach oben',
    trendDownTemplate: 'Seit letzter Woche {n} nach unten',
    mainGameTemplate: 'Hauptspiel: {share}% der letzten Streams',
    aboutRanking: 'Über dieses Ranking',
    faqMostFollowedQ: (category) =>
      `Welcher ${category}-Streamer hat die meisten Follower?`,
    // Werte in Klammern bzw. mittig im Satz — "Mio."-Kompaktformat darf nie
    // direkt vor dem Satzpunkt stehen (s. superlative).
    faqMostFollowedA: (category, top, second) => {
      const runnerUp = second ? `, vor ${second.name} (${second.value})` : '';
      return `${top.name} hat mit ${top.value} aktuell die meisten ${top.isTwitch ? 'Follower' : 'Abonnenten'} aller ${category}-Streamer, die wir tracken${runnerUp}. Die Zahlen werden täglich aktualisiert.`;
    },
    faqHowManyQ: (category) => `Wie viele Streamer streamen ${category}?`,
    faqHowManyA: (category, count, activity) => {
      const tail = activity
        ? ` Zusammen haben sie in den letzten 28 Tagen rund ${activity.hours} Stunden ${category} in ${activity.streams} Streams gestreamt.`
        : '';
      return `Wir tracken aktuell ${count} Streamer, die zuletzt ${category} gestreamt haben oder es im Sendeplan stehen haben.${tail}`;
    },
    faqMeasuredQ: 'Wie wird dieses Ranking gemessen?',
    faqMeasuredA: (category) =>
      `Streamer, die in den letzten 28 Tagen in ${category} aktiv waren, gerankt nach der Follower-Zahl ihres Hauptkanals — Kanal-Follower auf Twitch bzw. Abonnenten auf YouTube. Die Stunden- und Anteil-Spalten stammen aus einer nächtlichen Auswertung abgeschlossener ${category}-Streams.`,
    faqShareQ: 'Was bedeutet „Spielanteil“?',
    faqShareA: (category) =>
      `Der Anteil der letzten Streams eines Streamers, die ${category} waren. 100 % heißt, es ist gerade das einzige Spiel; ein niedriger Anteil markiert einen Gelegenheitsbesuch in der Kategorie.`,
    relatedRankings: 'Ähnliche Rankings',
    relatedRankingsAria: 'Ähnliche Spiel-Rankings',
    liveAndSchedule: (category) => `Jetzt live & Sendeplan für ${category} →`,
    allRankings: 'Alle Rankings',
    paginationAria: (category) => `${category}-Ranking-Seiten`,
    prev: '← Zurück',
    next: 'Weiter →',
  },
};
