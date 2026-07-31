import { formatCompactNumber } from '@/lib/format/number';
import type { HubLex } from './types';

export const it: HubLex = {
  crumbs: {
    aria: 'Percorso di navigazione',
    home: 'Home',
    liveNow: 'In diretta ora',
    games: 'Giochi',
    streamers: 'Streamer',
    rankings: 'Classifiche',
    pageN: (n) => `Pagina ${n}`,
  },
  common: {
    browseStreamersAZ: 'Tutti gli streamer dalla A alla Z',
    allGamesCategories: 'Tutti i giochi e le categorie',
  },
  home: {
    browseAllGames: 'Sfoglia tutti i giochi e le categorie →',
    seeLiveNow: 'Guarda chi è in diretta in questo momento →',
  },
  homeFeed: {
    ticker: (liveCount, soonCount, soonHours) => {
      const live = liveCount > 0 ? `${liveCount} streamer in diretta ora` : '';
      const soon =
        soonCount > 0 ? `${soonCount} iniziano nelle prossime ${soonHours} ore` : '';
      return live && soon ? `${live} · ${soon}` : live || soon;
    },
    liveTitle: 'I più visti in questo momento',
    liveFilterCategory: 'Categoria',
    liveFilterLanguage: 'Lingua',
    liveFilterAllCategories: 'Tutte le categorie',
    liveFilterAllLanguages: 'Tutte le lingue',
    liveFilterOption: (label, count) => `${label} (${count})`,
    liveFilterMatches: (count) => `${count} live`,
    liveFilterReset: 'Reimposta',
    liveFilterEmpty: 'Nessuna live corrisponde a questi filtri al momento.',
    liveFilterNote: (top, total) =>
      `Top ${top} per spettatori attuali — i filtri cercano tra tutte le ${total} live`,
    upNextTitle: 'Il palinsesto di oggi',
    upNextLink: 'In diretta e in arrivo →',
    lineupFilterTime: 'Ora',
    lineupFilterAllTimes: 'Qualsiasi ora',
    lineupFilterFrom: (time) => `Dalle ${time}`,
    lineupFilterMatches: (count) => `${count} stream`,
    lineupFilterEmpty: 'Nessuno stream corrisponde a questi filtri.',
    chipAll: 'Tutti',
    chipFavorites: 'I miei preferiti',
    lineupShowAll: (n) => `Mostra tutti i ${n} stream`,
    lineupShowMore: (n) => `Mostra altri ${n}`,
    lineupShowLess: 'Mostra meno',
    bellAria: (name) => `Ricevi un avviso quando ${name} va in diretta`,
    upsell: {
      bellTitle: 'Non perderti nessuno stream',
      bellBody:
        'Ricevi una notifica push poco prima che uno stream inizi — con l’app gratuita di Streamer Times.',
      favoritesTitle: 'I tuoi preferiti, a portata di tocco',
      favoritesBody:
        'Segui gli streamer e filtra questa pagina sul tuo palinsesto — gratis, nell’app o direttamente qui nel browser.',
      appCta: 'Scarica l’app',
      loginCta: 'Accedi gratis',
      close: 'Magari più tardi',
    },
    interrupt: {
      title: 'Questa pagina — solo con i tuoi streamer.',
      body: 'Segui i tuoi streamer e la guida diventa il tuo feed personale: il tuo palinsesto, notifiche push poco prima che vadano in diretta e i loro momenti migliori della settimana.',
      note: 'Ci vogliono 30 secondi · gratis',
      appCta: 'Scarica l’app',
      loginCta: 'Accedi dal web',
    },
    clipsTitle: 'Clip della settimana',
    clipsFilterMatches: (count) => `${count} clip`,
    clipsFilterEmpty: 'Nessuna clip corrisponde a questi filtri.',
    quickFactsTitle: 'Fatti in breve',
    quickFactsSub: 'Dagli ultimi 7 giorni di stream tracciati',
    factPredictionLabel: 'Verifica previsioni',
    factPrediction: (hits, total) =>
      `Per ${hits} delle ${total} previsioni con probabilità alta lo stream è iniziato entro due ore dall’orario previsto.`,
    factPeakLabel: 'Picco della settimana',
    factPeak: (name) =>
      `${name} ha raggiunto il massimo di spettatori simultanei questa settimana.`,
    factReliableLabel: 'Puntuale al minuto',
    factReliable: (name, hits, total) =>
      `${name} ha iniziato in orario ${hits} dei suoi ultimi ${total} stream annunciati.`,
    factPauseLabel: 'In pausa',
    factPause: (name) => `${name} è in pausa fino a questa data.`,
    risersTitle: 'In ascesa questa settimana',
    risersLink: 'Tutte le classifiche →',
    risersGained: (delta) => `${delta} follower in 7 giorni`,
    mostStreamedTitle: 'Chi ha streamato di più questa settimana',
    weekHours: (value) => `${value} h in diretta · 7 giorni`,
    weekStreams: (n) => `${n} stream`,
    mostWatchedTitle: 'I più visti',
    topStreamersCol: 'Top 5 streamer',
    topCategoriesCol: 'Top 5 categorie',
    medianViewers: (value) => `${value} spettatori (mediana)`,
    hoursStreamed: (value) => `${value} h in diretta · 28 giorni`,
    followers: (value) => `${value} follower`,
    missingStreamer: 'Manca il tuo streamer? Cercalo e aggiungilo →',
    endcap: {
      title: 'Porta il tuo palinsesto con te.',
      bullets: [
        'Segui i tuoi streamer preferiti',
        'Scopri chi va in diretta e quando',
        'Stats, clip e molto altro!',
      ],
      webLead: 'Preferisci il browser?',
      webLink: 'Crea un account gratuito',
      webTail: '— il tuo feed ti aspetta.',
    },
    sessionBanner: {
      text: 'Bentornato — il tuo feed personale è pronto.',
      cta: 'Vai al mio feed →',
    },
    sectionNav: {
      aria: 'Vai a una sezione',
      live: 'In diretta',
      lineup: 'Oggi',
      trending: 'Tendenze',
      clips: 'Clip',
      stats: 'Numeri',
      discover: 'Streamer',
    },
  },
  hero: {
    claim: 'Programmazione. Clip. Statistiche. Tutto in un unico posto.',
    ctaLogin: 'Accedi',
    ctaMid: ' o ',
    ctaApp: 'scarica l’app',
    ctaTail: ' per seguire i tuoi streamer preferiti.',
    ctaAppOnlyLink: 'Scarica l’app',
    ctaAppOnlyTail: ' per seguire i tuoi streamer preferiti.',
    kicker: 'Guida agli streamer in diretta',
    badgeNew: 'Novità',
    badgeLive: 'Ora disponibile per iOS e Android',
    titleLead: 'Il palinsesto delle dirette di ',
    titleTail: '',
    subtitle: 'La guida TV degli streamer.',
    bodyLead:
      `Un solo feed per Twitch e YouTube. Stato live in tempo reale, prossimi stream previsti dall'IA e zero rumore. Gratis, senza account —`,
    bodyLink: `scarica l'app`,
    bodyTail: 'per gli avvisi live.',
    appStoreSub: 'Scarica su',
    playSub: 'DISPONIBILE SU',
    phoneAlt: 'Una streamer sfoglia il programma di stasera sul telefono',
    phoneCaption: 'Un occhio al lineup di stasera',
    statBothLabel: 'Due piattaforme, una sola guida',
    statFavoritesValue: 'I tuoi preferiti',
    statFavoritesLabel: 'Aggiungi qualsiasi canale in pochi secondi',
    statApiValue: 'API pubblica',
    statApiLabel: `In arrivo · iscriviti alla lista d'attesa`,
  },
  upcoming: {
    heading: 'Prossimamente',
    aria: 'Stream in arrivo',
    empty: 'Niente in programma al momento — torna presto.',
  },
  trending: {
    heading: 'Di tendenza su Twitch',
    subtitle:
      'I giochi più grandi su Twitch in questo momento — i nostri streamer non li coprono ancora tutti.',
    aria: 'Giochi di tendenza su Twitch',
    rankOnTwitch: (rank) => `#${rank} su Twitch`,
    sortAria: 'Ordina i giochi',
    sortTwitch: 'Twitch',
    sortHours: 'Ore',
    sortViewers: 'Spettatori',
    sortStreamers: 'Streamer',
    liveViewers: (value) => `${value} stanno guardando`,
    streamerCount: (value) => `${value} streamer`,
  },
  popular: {
    heading: 'Streamer popolari',
    viewAll: 'Vedi tutti gli streamer →',
  },
  streamerWiki: {
    heading: 'Streamer Wiki',
    subline: 'Chi sono, a cosa giocano e quando vanno in diretta.',
    viewAll: 'Sfoglia tutti gli streamer →',
    followers: (value) => `≈${value} follower`,
    streams28d: (count) => `${count} ${count === 1 ? 'diretta' : 'dirette'} in 28 giorni`,
    liveNow: 'In diretta ora',
    nextPrefix: 'Prossima',
  },
  apiPromo: {
    heading: 'API per sviluppatori',
    comingSoon: 'In arrivo',
    eyebrow: 'Per sviluppatori',
    headlineLead: 'Costruisci con gli stessi dati —',
    headlineKey: 'presto, sulla nostra API.',
    body: `Stiamo integrando i primi partner pilota. Iscriviti alla lista d'attesa e ti scriveremo appena l'accesso pubblico sarà aperto — incluso un piano gratuito per gli sviluppatori indie.`,
    bullets: [
      'Stato live e numero di spettatori in tempo reale',
      `Prossimi stream previsti dall'IA con livello di confidenza`,
      'Webhook per gli eventi “è andato in diretta”',
      'Specifica OpenAPI inclusa',
    ],
    cta: `Iscriviti alla lista d'attesa`,
  },
  live: {
    h1: 'In diretta ora su Twitch e YouTube',
    intro: (liveCount, categoryCount, soonCount, soonHours = 6) =>
      `${liveCount} streamer ${liveCount === 1 ? 'è' : 'sono'} in diretta in questo momento` +
      (categoryCount > 0
        ? ` su ${categoryCount} ${categoryCount === 1 ? 'gioco e categoria' : 'giochi e categorie'}`
        : '') +
      '.' +
      (soonCount > 0
        ? ` ${soonCount === 1 ? `Un altro dovrebbe iniziare` : `Altri ${soonCount} dovrebbero iniziare`} nelle prossime ${soonHours} ore.`
        : ''),
    introEmpty: 'Nessuno è in diretta in questo momento — ecco chi inizia a breve.',
    error: 'Lo stato live è momentaneamente non disponibile. Riprova tra un attimo.',
    otherCategory: 'Altro',
    categoryLiveAria: (name) => `${name} — in diretta ora`,
    nLive: (n) => `${n} in diretta`,
    jumpToGame: 'Vai a un gioco',
    startingSoon: 'Iniziano a breve',
    nextNHours: (n) => `prossime ${n} ore`,
    emptyAll:
      'Niente è in diretta né sta per iniziare. Sfoglia la directory completa degli streamer o esplora i giochi per trovare il tuo prossimo stream.',
    itemListName: 'Streamer in diretta in questo momento su Twitch e YouTube',
  },
  streamers: {
    h1: 'Tutti gli streamer di Twitch e YouTube dalla A alla Z',
    intro:
      'Tutti gli streamer seguiti su Streamer Times — guarda chi è in diretta e cosa trasmetterà dopo. Scorri la lista completa pagina per pagina.',
    pageOf: (page, totalPages) => `Pagina ${page} di ${totalPages}.`,
    error: 'Gli streamer sono momentaneamente non disponibili. Riprova tra un attimo.',
    paginationAria: 'Paginazione',
    prev: '← Precedente',
    next: 'Successiva →',
  },
  games: {
    liveRightNow: 'In diretta in questo momento',
    liveAria: 'Giochi con stream in diretta',
    error: 'I giochi sono momentaneamente non disponibili. Riprova tra un attimo.',
    aboutHeading: 'Su questi giochi',
    updatedAt: (stamp) => `Aggiornato alle ${stamp}.`,
    relatedAria: 'Pagine correlate',
  },
  gamesRoot: {
    h1: 'I giochi più popolari su Twitch e YouTube',
    methodologyNote:
      'Ordinati in base a quanti streamer seguiamo in ogni categoria negli ultimi 28 giorni.',
    intro: (gameCount, liveStreamerCount, liveGameCount) => {
      const lead = `Seguiamo ${gameCount} ${gameCount === 1 ? 'gioco' : 'giochi'} e categorie su Twitch e YouTube.`;
      const note =
        'Ordinati in base a quanti streamer seguiamo in ogni categoria negli ultimi 28 giorni.';
      if (liveStreamerCount <= 0) return `${lead} ${note}`;
      const streamers = `${formatCompactNumber(liveStreamerCount, 'it')} streamer ${liveStreamerCount === 1 ? 'è' : 'sono'} in diretta in questo momento`;
      const across =
        liveGameCount > 0
          ? ` in ${liveGameCount} categor${liveGameCount === 1 ? 'ia' : 'ie'}`
          : '';
      return `${lead} ${streamers}${across}. ${note}`;
    },
    faqPopularQ: 'Qual è il gioco più popolare su Twitch e YouTube?',
    faqPopularA: (top, second) =>
      `${top.category} ha il maggior numero di streamer tra quelli che seguiamo — ${top.count} ${top.count === 1 ? 'canale lo ha trasmesso' : 'canali lo hanno trasmesso'} negli ultimi 28 giorni${second ? `, davanti a ${second.category} con ${second.count}` : ''}.`,
    faqWhoQ: 'Chi sta streammando in questo momento?',
    faqWhoA: (liveStreamerCount, liveGameCount) =>
      `${liveStreamerCount} streamer ${liveStreamerCount === 1 ? 'è' : 'sono'} in diretta in ${liveGameCount} categor${liveGameCount === 1 ? 'ia' : 'ie'}. Apri una categoria per vedere i canali in diretta e i loro prossimi stream.`,
    faqRankedQ: 'Come vengono classificati questi giochi?',
    faqRankedA: (gameCount) =>
      `Ordinati in base a quanti streamer seguiamo in ogni categoria negli ultimi 28 giorni. I numeri arrivano da un aggregato notturno delle trasmissioni concluse su ${gameCount} ${gameCount === 1 ? 'gioco' : 'giochi'}; i dati live si aggiornano ogni pochi minuti.`,
    faqHoursQ: '“Ore streammate” significa tempo di visione?',
    faqHoursA:
      'No. Le ore streammate misurano quanto tempo gli streamer sono stati in diretta in una categoria. Non rileviamo il tempo di visione degli spettatori; gli spettatori live mostrati sulle card sono un campione del momento, non un totale.',
  },
  rankings: {
    h1: 'Classifiche degli streamer',
    intro: (n) =>
      `Chi sono gli streamer più grandi, quelli che crescono più in fretta, i più attivi e i più affidabili su Twitch e YouTube? ${n} classifiche su tutti gli streamer che seguiamo — aggiornate ogni giorno con dati reali delle trasmissioni.`,
    dataRefreshed: (label) => ` Dati aggiornati il ${label}.`,
    statStreamersTracked: 'streamer seguiti',
    statLiveNow: 'in diretta ora',
    statGamesCategories: 'giochi e categorie',
    seeFullRanking: 'Vedi la classifica completa →',
    warmingUp: 'Le classifiche si stanno scaldando — torna presto.',
    byGameHeading: 'Classifiche per gioco',
    byGameSubtitle: 'Gli streamer più seguiti per ogni gioco e categoria.',
    byGameAria: 'Classifiche dei giochi popolari',
    topGameStreamers: (category) => `I migliori streamer di ${category}`,
    whoIsLive: 'Chi è in diretta in questo momento?',
    climbersThisWeek: 'Le maggiori scalate della settimana',
    metricH1: {
      'most-followed': 'Streamer più seguiti',
      'fastest-growing': 'Streamer in più rapida crescita',
      'most-watched': 'Streamer più visti',
      'most-active': 'Streamer più attivi',
      'most-reliable': 'Streamer più puntuali',
    },
    metricNote: {
      'most-followed':
        'Aggiornato ogni giorno. I conteggi di follower e iscritti vengono aggiornati regolarmente e possono restare indietro rispetto ai numeri live delle piattaforme.',
      'fastest-growing':
        'Crescita di follower del canale (Twitch) o iscritti (YouTube) negli ultimi 7 giorni, da snapshot giornalieri di ogni canale seguito. Solo i canali con crescita positiva entrano in classifica. Aggiornato ogni giorno.',
      'most-watched':
        'Mediana degli spettatori simultanei in diretta negli ultimi 28 giorni (campionamento orario). Aggiornato ogni giorno.',
      'most-active':
        'Ore totali in diretta negli ultimi 28 giorni. Ogni stream conta una volta; i canali 24/7 sempre attivi sono esclusi. Aggiornato ogni giorno.',
      'most-reliable':
        'Quota degli stream annunciati su Twitch effettivamente iniziati entro ±30 minuti, sugli ultimi 20 stream annunciati in 90 giorni (minimo 10 valutati). Aggiornato ogni giorno.',
    },
  },
};
