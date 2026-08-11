import { formatCompactNumber } from '@/lib/format/number';
import { listConjunction } from '@/lib/i18n-core';
import type { HubLex } from './types';

export const it: HubLex = {
  crumbs: {
    aria: 'Percorso di navigazione',
    home: 'Home',
    liveNow: 'In diretta ora',
    tonight: 'Stasera',
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
    qrTitle: 'Scansiona per scaricare Streamer Times',
    qrHeading: 'Scansiona per scaricare',
    qrHint: 'Inquadra qui con la fotocamera',
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
    upNextTonightLink: 'Tutta la serata →',
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
    quickFactsSub: 'Numeri dagli stream che tracciamo',
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
    factMarathonLabel: 'Maratona della settimana',
    factMarathon: (name) => `${name} è rimasto live tutto questo tempo di fila.`,
    factComebackLabel: 'Ritorno della settimana',
    factComeback: (name, days) => `${name} è tornato dopo ${days} giorni senza stream.`,
    factPrimeTimeLabel: 'Prime time',
    factPrimeTime: (total) =>
      `A quest’ora partono più stream che in qualsiasi altra, su ${total} stream in 4 settimane.`,
    factBusiestDayLabel: 'Giorno più pieno',
    factBusiestDay: (total) =>
      `Il giorno della settimana in cui partono più stream, su ${total} stream in 4 settimane.`,
    factLocalTimeNote: 'il tuo fuso orario',
    factUtcNote: 'UTC',
    factTopCategoryLabel: 'Categoria della settimana',
    factTopCategory: (category, streamers) =>
      `Stream su ${category} negli ultimi 7 giorni, da ${streamers} ${streamers === 1 ? 'streamer' : 'streamer'}.`,
    factCompetitionLabel: 'Livello di concorrenza',
    factCompetition: (category) =>
      `Canali tracciati live su ${category} in contemporanea, in media: la categoria più affollata che seguiamo.`,
    factRoomLabel: 'Spazio libero',
    factRoom: (category, channels) =>
      `Spettatori per canale su ${category}, con soli ${channels} canali tracciati live in contemporanea.`,
    factRoomSlotLabel: 'Momento migliore',
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
      'Cosa guardano tutti su Twitch in questo momento.',
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
  tonight: {
    h1: 'Chi streama stasera?',
    h1Night: 'Chi streama stanotte',
    intro: (total, names) =>
      `${total === 1 ? `C’è ${total} stream in programma` : `Ci sono ${total} stream in programma`} stasera su Twitch e YouTube` +
      (names ? `, tra cui ${names}` : '') +
      '.',
    introEmpty:
      'Per stasera non c’è ancora nulla in programma. Le previsioni si riempiono nel corso della giornata, man mano che gli streamer chiudono le dirette in corso.',
    timesInZone: (zone) => `Tutti gli orari in ${zone}`,
    timesLocal: 'Tutti gli orari nel tuo fuso orario',
    error: 'Il programma di stasera al momento non è disponibile. Riprova tra un attimo.',
    jumpAria: 'Vai a un momento della serata',
    liveNowHeading: 'Già in diretta',
    liveNowLink: 'Guarda tutti quelli in diretta ora',
    primetimeHeading: 'Il meglio di stasera',
    primetimeSub: (time) => `I nomi più grossi che vanno in diretta verso le ${time}.`,
    blockFrom: (time) => `Dalle ${time}`,
    blockNight: 'Notte fonda',
    blockCount: (n) => `${n} stream`,
    quietBody:
      'Ripassa più tardi oppure guarda chi è in diretta adesso — la serata di solito si riempie dopo le 18.',
    aboutHeading: 'Informazioni sulla guida di stasera',
    aboutBody:
      'Questa pagina è la vista serale di Streamer Times: tutti gli stream Twitch e YouTube che ci aspettiamo tra le 18 e le 6, raggruppati per orario di inizio, così puoi organizzare la serata come faresti con una guida TV.',
    faqWhatQ: 'Cosa c’è stasera?',
    faqWhatA:
      'I blocchi qui sopra elencano tutti gli stream annunciati o previsti per questa sera, dal più presto al più tardi. Gli stream annunciati arrivano direttamente dal calendario dello streamer; gli altri sono previsti dalla sua cronologia, con un badge di affidabilità su ogni scheda.',
    faqHowQ: 'Come fate a sapere quando qualcuno andrà in diretta?',
    faqHowA:
      'Seguiamo la cronologia delle dirette di ogni canale e i suoi annunci, poi prevediamo il prossimo avvio. Affidabilità alta significa uno schema forte e regolare o una data annunciata; affidabilità bassa significa che ultimamente il calendario è stato irregolare.',
    faqTimesQ: 'In che fuso orario sono gli orari?',
    faqTimesA: (zone) =>
      `Gli orari sono indicati in ${zone} e passano al tuo fuso orario appena la pagina si carica. La serata va dalle 18 alle 6, quindi uno stream che inizia dopo mezzanotte fa ancora parte di stasera.`,
    itemListName: 'Stream di stasera su Twitch e YouTube',
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
    h1: 'Classifiche degli streamer Twitch e YouTube',
    intro: (n) =>
      `Chi sono gli streamer più grandi, quelli che crescono più in fretta, i più attivi e i più affidabili su Twitch e YouTube? ${n} classifiche con statistiche su follower, spettatori e attività di tutti gli streamer che seguiamo — aggiornate ogni giorno con dati reali delle trasmissioni.`,
    dataRefreshed: (label) => ` Dati aggiornati il ${label}.`,
    seeFullRanking: 'Vedi la classifica completa →',
    warmingUp: 'Le classifiche si stanno scaldando — torna presto.',
    filterEmpty: 'Nessuno streamer di questa classifica corrisponde a questi filtri.',
    filterError: 'Non è stato possibile caricare la classifica filtrata.',
    filterRetry: 'Riprova',
    byGameHeading: 'Classifiche per gioco',
    byGameSubtitle: 'Gli streamer più seguiti per ogni gioco e categoria.',
    byGameAria: 'Classifiche dei giochi popolari',
    topGameStreamers: (category) => `I migliori streamer di ${category}`,
    gameChipStats: (category) => `Statistiche degli streamer di ${category}`,
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
    tableColStreamer: 'Streamer',
    tableColMainGame: 'Gioco principale',
    tableColNextStream: 'Prossimo stream',
    tableHeaders: {
      'Followers': 'Follower',
      'Avg viewers': 'Spettatori medi',
      'Gained (7d)': 'Guadagnati (7 g)',
      'Growth': 'Crescita',
      'Followers now': 'Follower ora',
      'Hours (28d)': 'Ore (28 g)',
      'Streams / week': 'Stream / settimana',
      'Avg duration': 'Durata media',
      'On-time rate': 'Puntualità',
      'Typical deviation': 'Scarto tipico',
      'Streams evaluated': 'Stream valutati',
    },
    trendNewLabel: 'nuovo',
    trendNewTitle: 'Una settimana fa non era in questa classifica',
    trendMoveTitle: (up, delta) => `${up ? 'Su' : 'Giù'} di ${delta} rispetto alla settimana scorsa`,
    mainGameShareTitle: (pct) => `${pct}% degli stream categorizzati`,
    alwaysOnTitle: 'Canale always-on — in diretta 24 ore su 24',
    faqHeading: 'Su queste classifiche',
    faqCalculatedQ: 'Come vengono calcolate queste classifiche di streamer?',
    faqCalculatedA:
      'Ogni classifica è calcolata da dati reali di trasmissione che raccogliamo noi stessi: conteggi di follower e iscritti, campionamento orario degli spettatori live e la cronologia degli stream di ogni canale Twitch e YouTube monitorato. Nessun numero autodichiarato.',
    faqUpdatedQ: 'Ogni quanto vengono aggiornate le statistiche?',
    faqUpdatedA:
      'Le classifiche vengono ricalcolate ogni notte — le statistiche su follower, spettatori e attività si aggiornano ogni giorno, mentre i badge live e i prossimi stream si aggiornano durante la giornata.',
    faqPlatformsQ: 'Quali piattaforme sono coperte?',
    faqPlatformsA:
      'Twitch e YouTube. La maggior parte delle classifiche unisce le due piattaforme — i follower su Twitch corrispondono agli iscritti su YouTube. La classifica della puntualità è solo Twitch, perché misura i palinsesti annunciati su Twitch.',
  },
  recaps: {
    metaTitleSuffix: 'Statistiche streamer Twitch e YouTube',
    weeklyKicker: 'Riepilogo settimanale',
    monthlyKicker: 'Riepilogo mensile',
    readMore: 'Leggi il riepilogo completo',
    archiveTitle: 'Archivio dei riepiloghi',
    archiveIntro:
      'Tutti i riepiloghi settimanali e mensili delle classifiche: chi è salito, chi è cresciuto più in fretta e le clip che hanno visto tutti.',
    allRecaps: 'Tutti i riepiloghi',
    backToRankings: 'Tutte le classifiche',
    previousEdition: 'Edizione precedente',
    nextEdition: 'Edizione successiva',
    translationPending:
      "Questa edizione non è ancora tradotta — mostriamo l'originale in inglese.",
  },
  gamesExplorer: {
    sectionAria: 'Tutti i giochi e le categorie',
    sortAria: 'Ordina i giochi',
    sortLabels: { streamers: 'Più streamer', hours: 'Più streammati', trending: 'Di tendenza' },
    viewTitles: {
      streamers: 'I giochi più popolari su Twitch e YouTube',
      hours: 'I giochi più streammati su Twitch e YouTube',
      trending: 'Giochi di tendenza su Twitch e YouTube',
    },
    searchPlaceholder: 'Cerca giochi…',
    searchAria: 'Cerca giochi',
    noMatch: 'Nessun gioco corrisponde a “{q}”.',
  },
  gameChips: {
    aria: (category) => `Statistiche di ${category}`,
    streamersLabel: () => 'streamer',
    liveNowLabel: 'in diretta ora',
    watchingLabel: 'spettatori',
    streamedLabel: 'di stream · 28 giorni',
    streamsLabel: () => 'stream · 28 giorni',
    peakLead: 'Picco di ',
    peakTail: ' spettatori · 28 giorni',
    trendTail: ' questa settimana',
    trendTitle: 'Variazione degli streamer attivi rispetto alla settimana scorsa',
  },
  game: {
    notFoundTitle: 'Gioco non trovato — Streamer Times',
    metaTitle: (category) => `Streamer di ${category} — In diretta, classifiche e orari`,
    metaDescription: (category, names) => {
      const tail = `Chi è in diretta ora, prossimi stream e orari previsti dall'IA su Twitch e YouTube.`;
      const namesLead =
        names.length > 0
          ? `${listConjunction(names, 'it')} ${names.length === 1 ? 'guida' : 'guidano'} la classifica di ${category}. `
          : '';
      const twoNamesLead =
        names.length > 1
          ? `${listConjunction(names.slice(0, 2), 'it')} guidano la classifica di ${category}. `
          : '';
      return [
        `${namesLead}${tail}`,
        `${twoNamesLead}${tail}`,
        `Gli streamer di ${category} con più follower. ${tail}`,
        tail,
      ];
    },
    ogTitle: (category) => `Streamer di ${category} — in diretta, classifiche e orari`,
    ogDescription: (category, names) => {
      const ogNames = names.length > 0 ? ` — ${listConjunction(names, 'it')} —` : ':';
      return `Gli streamer di ${category} con più follower${ogNames} stato live e orari degli stream su Twitch e YouTube.`;
    },
    h1: (category) => `Streamer di ${category} — in diretta e orari`,
    intro: (shown, category, liveCount, upcomingCount, superlative) =>
      `${shown} streamer ${shown === 1 ? 'ha' : 'hanno'} stream di ${category} in diretta o in programma questa settimana su Twitch e YouTube. ` +
      (liveCount > 0
        ? `${liveCount} ${liveCount === 1 ? 'è' : 'sono'} in diretta in questo momento`
        : 'Nessuno è in diretta in questo momento') +
      (upcomingCount > 0
        ? `, con ${upcomingCount} stream in arrivo nei prossimi 7 giorni.`
        : '.') +
      superlative,
    superlative: (category, name, value, isTwitch) =>
      ` Lo streamer di ${category} con più ${isTwitch ? 'follower' : 'iscritti'} qui è ${name}, con ${value}.`,
    onPageAria: 'In questa pagina',
    navLiveNow: 'In diretta',
    navTopStreamers: 'Top streamer',
    navBestTimes: 'Orari migliori',
    navSchedule: 'Programma',
    navRelated: 'Giochi correlati',
    followGame: (category) => `Segui ${category}`,
    followingLabel: 'Seguito',
    watchingNow: (category) => `${category} in diretta ora`,
    liveStreamsAria: (category) => `Stream di ${category} in diretta`,
    moreLiveAria: (category) => `Altri stream di ${category} in diretta`,
    showMoreLive: (n) =>
      n === 1 ? 'Mostra un altro canale in diretta' : `Mostra altri ${n} canali in diretta`,
    moreLiveInRanking: (n, category) =>
      `Altri ${n} in diretta nella classifica completa di ${category} →`,
    liveUpdatesNote:
      'Lo stato live e gli spettatori si aggiornano ogni pochi minuti.',
    mostFollowed: (category) => `Streamer di ${category} con più follower`,
    tableCaption: (category) =>
      `Streamer di ${category} ordinati per follower, con il prossimo stream atteso`,
    thRank: '#',
    thStreamer: 'Streamer',
    thNextStream: 'Prossimo stream',
    thFollowers: 'Follower',
    thHours: 'Ore / 28 giorni',
    liveNowCell: 'In diretta',
    seeFullRanking: (category) =>
      `Vedi la classifica completa di ${category} (top 50) →`,
    whoStreams: (category) => `Streamer che streammano ${category}`,
    whenStreamed: (category) => `Quando viene streammato ${category}?`,
    heatmapSummary: (category) =>
      `La maggior parte degli stream di ${category} va in onda {peak}{tz} — in base alle ultime 4 settimane di stream tracciati.`,
    heatmapSummaryEmpty: 'In base alle ultime 4 settimane di stream tracciati.',
    tzLocalSuffix: ' (la tua ora)',
    tzUtcSuffix: ' (UTC)',
    heatmapAria: (category) => `Heatmap settimanale degli stream di ${category}.`,
    heatmapAriaWithPeak: (category) =>
      `Heatmap settimanale degli stream di ${category}. Fascia più attiva: {peak}.`,
    heatmapTooltip: '{day} {from}–{to} · {amount} di stream in 4 settimane',
    legendLess: 'Meno',
    legendMore: 'Più',
    heatmapDayNames: [
      'il lunedì',
      'il martedì',
      'il mercoledì',
      'il giovedì',
      'il venerdì',
      'il sabato',
      'la domenica',
    ],
    bestTimeToStream: (category) => `Il momento migliore per streammare ${category}`,
    trendingBadge: '▲ In tendenza',
    bestTimeIntro: (category) =>
      `Per gli streamer: le fasce in cui ${category} ha più spettatori per canale in diretta.`,
    fullHeatmapLink: 'Heatmap delle opportunità e analisi completa →',
    bestSlotsAria: 'Fasce orarie migliori',
    viewersPerChannel: '~{score} spettatori/canale',
    timesLocalNote: 'Orari nel tuo fuso orario.',
    timesUtcNote: 'Orari in UTC.',
    quietTitle: (category) => `Nessuno stream di ${category} al momento`,
    quietBody: (category) =>
      `Nessuno degli streamer di ${category} che seguiamo è in diretta o atteso nei prossimi 7 giorni. Programmi e previsioni IA si aggiornano più volte al giorno — ripassa presto.`,
    quietMeanwhile: 'Nel frattempo',
    seeWhosLive: 'Guarda chi è in diretta ora →',
    browseAllGames: 'Sfoglia tutti i giochi',
    gameStreamersChip: (category) => `Streamer di ${category}`,
    scheduleAria: (category) => `Programma degli stream di ${category}`,
    upcomingStreams: (category) => `Prossimi stream di ${category}`,
    scheduleNote:
      `Gli orari si adattano al tuo fuso, con accanto l'ora dello streamer. I giorni seguono il calendario UTC, quindi uno stream a notte fonda può comparire sotto il giorno successivo.`,
    filterAria: 'Filtra il programma',
    allPlatforms: 'Tutte le piattaforme',
    hideLowConfidence: 'Nascondi probabilità bassa',
    moreLowConfidence: (n) =>
      n === 1
        ? `Un'altra previsione con probabilità bassa`
        : `Altre ${n} previsioni con probabilità bassa`,
    lowConfAria: (label) => `Previsioni con probabilità bassa: ${label}`,
    hiddenNotShown: (n) =>
      n === 1
        ? `Un'altra previsione di questo giorno non è mostrata. Apri la pagina dello streamer per il programma completo.`
        : `Altre ${n} previsioni di questo giorno non sono mostrate. Apri la pagina dello streamer per il programma completo.`,
    relatedGames: 'Giochi correlati',
    relatedGamesAria: 'Giochi correlati',
    relatedNote:
      'Giochi i cui streamer si sovrappongono negli ultimi 28 giorni.',
    allGamesFooter: '← Tutti i giochi e le categorie',
  },
  gameRanking: {
    notFoundTitle: 'Non trovato — Streamer Times',
    metaTitle: (category, page) =>
      page === 1
        ? `Top streamer di ${category} — per follower`
        : `Top streamer di ${category} — per follower — Pagina ${page}`,
    metaLeadIn: (name, value) => `${name} guida con ${value} follower. `,
    metaDescription: (category, leadIn) => [
      `${leadIn}I migliori streamer di ${category} su Twitch e YouTube, ordinati per follower, con stato live e prossimi stream. Aggiornato ogni giorno.`,
      `${leadIn}I migliori streamer di ${category} per follower, con stato live e prossimi stream.`,
      `I migliori streamer di ${category} su Twitch e YouTube, ordinati per follower, con stato live e prossimi stream. Aggiornato ogni giorno.`,
    ],
    ogTitle: (category) => `Top streamer di ${category} — per follower`,
    h1: (category) => `Top streamer di ${category} per follower`,
    introPage1: (count, category) =>
      `I ${count} migliori streamer di ${category} che seguiamo, ordinati per follower e iscritti del canale.`,
    topsTheList: (name, value, isTwitch) =>
      ` ${name} è in testa con ${value} ${isTwitch ? 'follower' : 'iscritti'}.`,
    introPageN: (from, to, total, category) =>
      `Posizioni ${from}–${to} di ${total} streamer di ${category} che seguiamo, ordinati per follower e iscritti del canale.`,
    methodology: (category) =>
      `Streamer attivi in ${category} negli ultimi 28 giorni, ordinati per follower. I numeri vengono aggiornati regolarmente e possono restare indietro rispetto alle piattaforme.`,
    followersRefreshed: (label) => ` Follower aggiornati: ${label}.`,
    warmingUp:
      'Questa classifica si sta ancora scaldando — ci servono un po’ più di dati prima che dica qualcosa. Ripassa presto.',
    missingDataNote:
      '— significa che non abbiamo ancora raccolto abbastanza dati per quel canale, ad esempio i campionamenti degli spettatori per i canali appena aggiunti.',
    sortAria: 'Ordina la classifica',
    sortFollowers: 'Più seguiti',
    sortHours: 'Più ore (28 giorni)',
    sortViewers: 'Più visti',
    filterLangAria: 'Filtra per lingua',
    allChip: 'Tutti',
    noMatch: 'Nessuno streamer corrisponde a questo filtro.',
    tableCaption: (category) => `Streamer di ${category} ordinati per follower`,
    thRank: '#',
    thStreamer: 'Streamer',
    thFollowers: 'Follower',
    thAvgViewers: 'Spettatori medi',
    thHours: 'Ore (28 giorni)',
    thShare: 'Quota del gioco',
    thShareTitle: (category) =>
      `Quota degli ultimi stream dello streamer dedicati a ${category}`,
    thNextStream: 'Prossimo stream',
    liveNowCell: 'In diretta',
    watchingTail: ' · {value} spettatori',
    trendNewBadge: 'nuovo',
    trendNewTitle: 'Una settimana fa non era in questa classifica',
    trendUpTemplate: 'Su di {n} rispetto alla settimana scorsa',
    trendDownTemplate: 'Giù di {n} rispetto alla settimana scorsa',
    mainGameTemplate: 'Gioco principale: {share}% degli ultimi stream',
    aboutRanking: 'Su questa classifica',
    faqMostFollowedQ: (category) =>
      `Quale streamer di ${category} ha più follower?`,
    faqMostFollowedA: (category, top, second) => {
      const runnerUp = second ? `, davanti a ${second.name} con ${second.value}` : '';
      return `${top.name} è al momento lo streamer di ${category} con più ${top.isTwitch ? 'follower' : 'iscritti'} tra quelli che seguiamo, con ${top.value}${runnerUp}. I numeri vengono aggiornati ogni giorno.`;
    },
    faqHowManyQ: (category) => `Quanti streamer streammano ${category}?`,
    faqHowManyA: (category, count, activity) => {
      const tail = activity
        ? ` Insieme hanno streammato circa ${activity.hours} ore di ${category} in ${activity.streams} stream negli ultimi 28 giorni.`
        : '';
      return `Al momento seguiamo ${count} streamer che hanno streammato ${category} di recente o lo hanno in programma.${tail}`;
    },
    faqMeasuredQ: 'Come viene misurata questa classifica?',
    faqMeasuredA: (category) =>
      `Streamer attivi in ${category} negli ultimi 28 giorni, ordinati per i follower del canale principale — follower del canale su Twitch o iscritti su YouTube. Le colonne di ore e quota vengono da un aggregato notturno degli stream di ${category} conclusi.`,
    faqShareQ: 'Cosa significa “Quota del gioco”?',
    faqShareA: (category) =>
      `La quota degli ultimi stream di uno streamer dedicati a ${category}. 100% significa che al momento è il suo unico gioco; una quota bassa indica un visitatore occasionale della categoria.`,
    relatedRankings: 'Classifiche correlate',
    relatedRankingsAria: 'Classifiche di giochi correlati',
    liveAndSchedule: (category) => `In diretta e programma di ${category} →`,
    allRankings: 'Tutte le classifiche',
    paginationAria: (category) => `Pagine della classifica di ${category}`,
    prev: '← Precedente',
    next: 'Successiva →',
  },
};
