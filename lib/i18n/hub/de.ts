import { formatCompactNumber } from '@/lib/format/number';
import type { HubLex } from './types';

export const de: HubLex = {
  crumbs: {
    aria: 'Seitenpfad',
    home: 'Startseite',
    liveNow: 'Jetzt live',
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
    liveTitle: 'Jetzt live',
    upNextTitle: 'Heute im Programm',
    upNextLink: 'Live & demnächst →',
    chipAll: 'Alle',
    chipFavorites: 'Meine Favoriten',
    lineupShowAll: (n) => `Alle ${n} Streams anzeigen`,
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
    quickFactsTitle: 'Quick Facts',
    quickFactsSub: 'Aus den letzten 7 Tagen erfasster Streams',
    factPredictionLabel: 'Prognose-Check',
    factPrediction: (hits, total) =>
      `${hits} von ${total} KI-vorhergesagten Streams starteten wie prognostiziert.`,
    factPeakLabel: 'Peak der Woche',
    factPeak: (name) =>
      `${name} erreichte diese Woche die meisten gleichzeitigen Zuschauer.`,
    factReliableLabel: 'Auf die Minute',
    factReliable: (name, hits, total) =>
      `${name} startete ${hits} von ${total} zuletzt angekündigten Streams pünktlich.`,
    factPauseLabel: 'In der Pause',
    factPause: (name) => `${name} macht bis zu diesem Datum Pause.`,
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
        'Push-Alarm, sobald deine Streamer live gehen',
        'Up-Next-Widget auf deinem Homescreen',
        'Favoriten synchron — Handy & Web',
      ],
      webLead: 'Lieber im Browser?',
      webLink: 'Erstell ein kostenloses Konto',
      webTail: '— dein Feed wartet.',
    },
    sessionBanner: {
      text: 'Willkommen zurück — dein persönlicher Feed ist bereit.',
      cta: 'Zu meinem Feed →',
    },
  },
  hero: {
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
      'Die größten Spiele auf Twitch gerade jetzt — noch nicht alle davon werden von unseren Streamern abgedeckt.',
    aria: 'Angesagte Spiele auf Twitch',
    rankOnTwitch: (rank) => `#${rank} auf Twitch`,
  },
  popular: {
    heading: 'Beliebte Streamer',
    viewAll: 'Alle Streamer ansehen →',
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
    startingSoon: 'Startet bald',
    nextNHours: (n) => `nächste ${n} Stunden`,
    emptyAll:
      'Gerade ist nichts live und nichts startet in Kürze. Stöbere durch das komplette Streamer-Verzeichnis oder entdecke Spiele für deinen nächsten Stream.',
    itemListName: 'Streamer, die gerade auf Twitch & YouTube live sind',
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
    statStreamersTracked: 'erfasste Streamer',
    statLiveNow: 'gerade live',
    statGamesCategories: 'Spiele & Kategorien',
    seeFullRanking: 'Zum kompletten Ranking →',
    warmingUp: 'Die Ranglisten laufen sich noch warm — schau bald wieder vorbei.',
    byGameHeading: 'Rankings nach Spiel',
    byGameSubtitle: 'Die meistgefolgten Streamer für jedes Spiel und jede Kategorie.',
    byGameAria: 'Beliebte Spiel-Rankings',
    topGameStreamers: (category) => `Die besten ${category}-Streamer`,
    whoIsLive: 'Wer ist gerade live?',
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
  },
};
