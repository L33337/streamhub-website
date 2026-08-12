import { formatCompactNumber } from '@/lib/format/number';
import { listConjunction } from '@/lib/i18n-core';
import type { HubLex } from './types';

export const fr: HubLex = {
  crumbs: {
    aria: `Fil d'Ariane`,
    home: 'Accueil',
    liveNow: 'En direct maintenant',
    tonight: 'Ce soir',
    games: 'Jeux',
    streamers: 'Streamers',
    rankings: 'Classements',
    pageN: (n) => `Page ${n}`,
  },
  common: {
    browseStreamersAZ: 'Tous les streamers de A à Z',
    allGamesCategories: 'Tous les jeux et catégories',
  },
  home: {
    browseAllGames: 'Parcourir tous les jeux et catégories →',
    seeLiveNow: 'Vois qui est en direct en ce moment →',
    qrTitle: 'Scanne pour télécharger Streamer Times',
    qrHeading: 'Scanne pour télécharger',
    qrHint: 'Vise ce code avec ton téléphone',
  },
  homeFeed: {
    ticker: (liveCount, soonCount, soonHours) => {
      const live =
        liveCount > 0
          ? `${liveCount} streamer${liveCount === 1 ? '' : 's'} en direct en ce moment`
          : '';
      const soon =
        soonCount > 0
          ? `${soonCount} commencent dans les ${soonHours} prochaines heures`
          : '';
      return live && soon ? `${live} · ${soon}` : live || soon;
    },
    liveTitle: 'Les plus regardés en ce moment',
    liveFilterCategory: 'Catégorie',
    liveFilterLanguage: 'Langue',
    liveFilterAllCategories: 'Toutes les catégories',
    liveFilterAllLanguages: 'Toutes les langues',
    liveFilterOption: (label, count) => `${label} (${count})`,
    liveFilterMatches: (count) => `${count} lives`,
    liveFilterReset: 'Réinitialiser',
    liveFilterEmpty: 'Aucun live ne correspond à ces filtres pour le moment.',
    liveFilterNote: (top, total) =>
      `Top ${top} par spectateurs actuels — les filtres couvrent les ${total} lives`,
    upNextTitle: 'Le programme du jour',
    upNextLink: 'En direct et bientôt →',
    upNextTonightLink: 'Toute la soirée →',
    lineupFilterTime: 'Heure',
    lineupFilterAllTimes: 'À toute heure',
    lineupFilterFrom: (time) => `À partir de ${time}`,
    lineupFilterMatches: (count) => `${count} stream${count === 1 ? '' : 's'}`,
    lineupFilterEmpty: 'Aucun stream ne correspond à ces filtres.',
    chipAll: 'Tous',
    chipFavorites: 'Mes favoris',
    lineupShowAll: (n) => `Afficher les ${n} streams`,
    lineupShowMore: (n) => `Afficher ${n} de plus`,
    lineupShowLess: 'Réduire',
    bellAria: (name) => `Être prévenu quand ${name} passe en direct`,
    upsell: {
      bellTitle: 'Ne rate plus aucun stream',
      bellBody:
        'Reçois une notification push juste avant le début d’un stream — avec l’appli gratuite Streamer Times.',
      favoritesTitle: 'Tes favoris, à portée de main',
      favoritesBody:
        'Suis des streamers et filtre cette page sur ton propre programme — gratuit, dans l’appli ou directement ici dans le navigateur.',
      appCta: 'Télécharger l’appli',
      loginCta: 'Connecte-toi gratuitement',
      close: 'Peut-être plus tard',
    },
    interrupt: {
      title: 'Cette page — avec seulement tes streamers.',
      body: 'Suis tes streamers et le guide devient ton feed personnel : ton programme, des alertes push juste avant leurs directs et leurs meilleurs moments de la semaine.',
      note: '30 secondes · gratuit',
      appCta: 'Télécharger l’appli',
      loginCta: 'Se connecter sur le web',
    },
    clipsTitle: 'Clips de la semaine',
    clipsFilterMatches: (count) => `${count} clip${count === 1 ? '' : 's'}`,
    clipsFilterEmpty: 'Aucun clip ne correspond à ces filtres.',
    quickFactsTitle: 'En bref',
    quickFactsSub: 'Des chiffres tirés des streams que nous suivons',
    factPredictionLabel: 'Vérif des prédictions',
    factPrediction: (hits, total) =>
      `Pour ${hits} des ${total} prédictions à probabilité élevée, le stream a démarré à moins de deux heures de l’horaire prévu.`,
    factPeakLabel: 'Pic de la semaine',
    factPeak: (name) =>
      `${name} a atteint le plus de spectateurs simultanés cette semaine.`,
    factReliableLabel: 'À l’heure pile',
    factReliable: (name, hits, total) =>
      `${name} a lancé à l’heure ${hits} de ses ${total} derniers streams annoncés.`,
    factPauseLabel: 'En pause',
    factPause: (name) => `${name} fait une pause jusqu’à cette date.`,
    factMarathonLabel: 'Marathon de la semaine',
    factMarathon: (name) => `${name} est resté en live aussi longtemps d’affilée.`,
    factComebackLabel: 'Retour de la semaine',
    factComeback: (name, days) => `${name} revient après ${days} jours sans stream.`,
    factPrimeTimeLabel: 'Prime time',
    factPrimeTime: (total) =>
      `Plus de streams démarrent à cette heure qu’à n’importe quelle autre, sur ${total} streams en 4 semaines.`,
    factBusiestDayLabel: 'Jour le plus chargé',
    factBusiestDay: (total) =>
      `Le jour de la semaine où démarrent le plus de streams, sur ${total} streams en 4 semaines.`,
    factLocalTimeNote: 'ton fuseau horaire',
    factUtcNote: 'UTC',
    factTopCategoryLabel: 'Catégorie de la semaine',
    factTopCategory: (category, streamers) =>
      `Streams sur ${category} ces 7 derniers jours, par ${streamers} ${streamers === 1 ? 'streameur' : 'streameurs'}.`,
    factCompetitionLabel: 'Niveau de concurrence',
    factCompetition: (category) =>
      `Chaînes suivies en live sur ${category} en même temps, en moyenne — la catégorie la plus chargée chez nous.`,
    factRoomLabel: 'Place à prendre',
    factRoom: (category, channels) =>
      `Spectateurs par chaîne sur ${category}, avec seulement ${channels} chaînes suivies en live en même temps.`,
    factRoomSlotLabel: 'Meilleur créneau',
    risersTitle: 'Les ascensions de la semaine',
    risersLink: 'Tous les classements →',
    risersGained: (delta) => `${delta} followers en 7 jours`,
    mostStreamedTitle: 'Ceux qui ont le plus streamé cette semaine',
    weekHours: (value) => `${value} h en direct · 7 jours`,
    weekStreams: (n) => `${n} stream${n === 1 ? '' : 's'}`,
    mostWatchedTitle: 'Les plus regardés',
    topStreamersCol: 'Top 5 streamers',
    topCategoriesCol: 'Top 5 catégories',
    medianViewers: (value) => `${value} spectateurs (médiane)`,
    hoursStreamed: (value) => `${value} h en direct · 28 jours`,
    followers: (value) => `${value} followers`,
    missingStreamer: 'Ton streamer manque ? Cherche-le et ajoute-le →',
    endcap: {
      title: 'Emporte ton programme avec toi.',
      bullets: [
        'Suis tes streamers préférés',
        'Vois qui passe en live et quand',
        'Stats, clips et bien plus !',
      ],
      webLead: 'Tu préfères le navigateur ?',
      webLink: 'Crée un compte gratuit',
      webTail: '— ton feed t’attend.',
    },
    sessionBanner: {
      text: 'Content de te revoir — ton feed personnel est prêt.',
      cta: 'Vers mon feed →',
    },
    sectionNav: {
      aria: 'Aller à une section',
      live: 'En direct',
      lineup: 'Aujourd’hui',
      trending: 'Tendances',
      clips: 'Clips',
      stats: 'Chiffres',
      discover: 'Streamers',
    },
  },
  hero: {
    claim: 'Programme. Clips. Stats. Tout au même endroit.',
    ctaLogin: 'Connecte-toi',
    ctaMid: ' ou ',
    ctaApp: 'télécharge l’appli',
    ctaTail: ' pour suivre tes streamers préférés.',
    ctaAppOnlyLink: 'Télécharge l’appli',
    ctaAppOnlyTail: ' pour suivre tes streamers préférés.',
    kicker: 'Guide des streamers en direct',
    badgeNew: 'Nouveau',
    badgeLive: 'Disponible sur iOS et Android',
    titleLead: 'Le programme des streams en direct sur ',
    titleTail: '',
    subtitle: 'Le guide TV des streamers.',
    bodyLead:
      `Un seul flux pour Twitch et YouTube. Statut en direct en temps réel, prochains streams prédits par l'IA et zéro bruit. Gratuit, sans compte —`,
    bodyLink: `télécharge l'app`,
    bodyTail: 'pour les alertes de direct.',
    appStoreSub: 'Télécharger sur',
    playSub: 'DISPONIBLE SUR',
    phoneAlt: 'Une streameuse qui parcourt le programme de ce soir sur son téléphone',
    phoneCaption: 'Un œil sur le programme de ce soir',
    statBothLabel: 'Deux plateformes, un seul guide',
    statFavoritesValue: 'Tes favoris',
    statFavoritesLabel: `Ajoute n'importe quelle chaîne en quelques secondes`,
    statApiValue: 'API publique',
    statApiLabel: `Bientôt disponible · rejoins la liste d'attente`,
  },
  upcoming: {
    heading: 'À suivre',
    aria: 'Streams à venir',
    empty: 'Rien de prévu pour le moment — reviens bientôt.',
  },
  trending: {
    heading: 'Tendances sur Twitch',
    subtitle:
      'Ce que tout Twitch regarde en ce moment.',
    aria: 'Jeux en tendance sur Twitch',
    rankOnTwitch: (rank) => `#${rank} sur Twitch`,
    sortAria: 'Trier les jeux',
    sortTwitch: 'Twitch',
    sortHours: 'Heures',
    sortViewers: 'Spectateurs',
    sortStreamers: 'Streamers',
    liveViewers: (value) => `${value} regardent`,
    streamerCount: (value, count) => `${value} ${count === 1 ? 'streamer' : 'streamers'}`,
  },
  popular: {
    heading: 'Streamers populaires',
    viewAll: 'Voir tous les streamers →',
  },
  streamerWiki: {
    heading: 'Streamer Wiki',
    subline: 'Qui ils sont, à quoi ils jouent et quand ils passent en live.',
    viewAll: 'Parcourir tous les streamers →',
    followers: (value) => `≈${value} abonnés`,
    streams28d: (count) => `${count} ${count === 1 ? 'live' : 'lives'} en 28 jours`,
    liveNow: 'En live',
    nextPrefix: 'Prochain',
  },
  apiPromo: {
    heading: 'API développeurs',
    comingSoon: 'Bientôt disponible',
    eyebrow: 'Pour les développeurs',
    headlineLead: 'Construis avec les mêmes données —',
    headlineKey: 'bientôt, sur notre API.',
    body: `Nous accueillons actuellement nos premiers partenaires pilotes. Rejoins la liste d'attente et nous t'écrirons dès l'ouverture de l'accès public — avec une offre gratuite pour les développeurs indés.`,
    bullets: [
      'Statut en direct et nombre de spectateurs en temps réel',
      `Prochains streams prédits par l'IA avec niveau de confiance`,
      'Webhooks pour les événements « passé en direct »',
      'Spécification OpenAPI incluse',
    ],
    cta: `Rejoindre la liste d'attente`,
  },
  live: {
    h1: 'En direct maintenant sur Twitch et YouTube',
    intro: (liveCount, categoryCount, soonCount, soonHours = 6) =>
      `${liveCount} streamer${liveCount === 1 ? ' est' : 's sont'} en direct en ce moment` +
      (categoryCount > 0
        ? ` sur ${categoryCount} jeu${categoryCount === 1 ? '' : 'x'} et catégories`
        : '') +
      '.' +
      (soonCount > 0
        ? ` ${soonCount} autre${soonCount === 1 ? ' doit' : 's doivent'} commencer dans les ${soonHours} prochaines heures.`
        : ''),
    introEmpty: `Personne n'est en direct pour le moment — voici qui commence bientôt.`,
    error: 'Le statut en direct est momentanément indisponible. Réessaie dans un instant.',
    otherCategory: 'Autres',
    categoryLiveAria: (name) => `${name} — en direct maintenant`,
    nLive: (n) => `${n} en direct`,
    jumpToGame: 'Aller à un jeu',
    startingSoon: 'Bientôt en direct',
    nextNHours: (n) => `${n} prochaines heures`,
    emptyAll:
      `Rien n'est en direct ni sur le point de commencer. Parcours l'annuaire complet des streamers ou explore les jeux pour trouver ton prochain stream.`,
    itemListName: 'Streamers en direct en ce moment sur Twitch et YouTube',
  },
  tonight: {
    h1: 'Qui streame ce soir ?',
    h1Night: 'Qui streame cette nuit',
    intro: (total, names) =>
      `${total} stream${total === 1 ? ' est prévu' : 's sont prévus'} ce soir sur Twitch et YouTube` +
      (names ? `, dont ${names}` : '') +
      '.',
    introEmpty:
      'Rien n’est encore prévu pour ce soir. Les prédictions se remplissent au fil de la journée, à mesure que les streamers terminent leurs directs.',
    timesInZone: (zone) => `Toutes les heures en ${zone}`,
    timesLocal: 'Toutes les heures dans ton fuseau horaire',
    error: 'Le programme de ce soir est momentanément indisponible. Réessaie dans un instant.',
    jumpAria: 'Aller à un moment de la soirée',
    liveNowHeading: 'Déjà en direct',
    liveNowLink: 'Voir tout le monde en direct',
    primetimeHeading: 'Les temps forts de la soirée',
    primetimeSub: (time) => `Les plus gros noms qui passent en direct vers ${time}.`,
    blockFrom: (time) => `À partir de ${time}`,
    blockNight: 'Fin de nuit',
    blockCount: (n) => `${n} stream${n === 1 ? '' : 's'}`,
    quietBody:
      'Repasse plus tard ou regarde qui est en direct maintenant — la soirée se remplit généralement à partir de 18 h.',
    aboutHeading: 'À propos du guide de la soirée',
    aboutBody:
      'Cette page est la vue soirée de Streamer Times : tous les streams Twitch et YouTube que nous attendons entre 18 h et 6 h, regroupés par heure de début, pour que tu planifies ta soirée comme avec un programme TV.',
    faqWhatQ: 'Qu’y a-t-il ce soir ?',
    faqWhatA:
      'Les blocs ci-dessus listent tous les streams annoncés ou prédits pour cette soirée, du plus tôt au plus tard. Les streams annoncés viennent directement du planning du streamer ; les autres sont prédits à partir de son historique, avec un badge de confiance sur chaque carte.',
    faqHowQ: 'Comment savez-vous quand quelqu’un va streamer ?',
    faqHowA:
      'Nous suivons l’historique de diffusion de chaque chaîne et ses annonces, puis nous prédisons le prochain démarrage. Une confiance élevée signifie un rythme régulier et marqué ou une date annoncée ; une confiance faible signifie que le planning a été irrégulier ces derniers temps.',
    faqTimesQ: 'Dans quel fuseau horaire sont les heures ?',
    faqTimesA: (zone) =>
      `Les heures sont affichées en ${zone} et passent dans ton propre fuseau horaire une fois la page chargée. La soirée va de 18 h à 6 h : un stream qui commence après minuit fait donc encore partie de ce soir.`,
    itemListName: 'Streams de ce soir sur Twitch et YouTube',
  },
  streamers: {
    h1: 'Tous les streamers Twitch et YouTube de A à Z',
    intro:
      'Tous les streamers suivis sur Streamer Times — vois qui est en direct et ce qui arrive ensuite. Parcours la liste complète page par page.',
    pageOf: (page, totalPages) => `Page ${page} sur ${totalPages}.`,
    error: 'Les streamers sont momentanément indisponibles. Réessaie dans un instant.',
    paginationAria: 'Pagination',
    prev: '← Précédent',
    next: 'Suivant →',
  },
  games: {
    liveRightNow: 'En direct en ce moment',
    liveAria: 'Jeux avec des streams en direct',
    error: 'Les jeux sont momentanément indisponibles. Réessaie dans un instant.',
    aboutHeading: 'À propos de ces jeux',
    updatedAt: (stamp) => `Mis à jour à ${stamp}.`,
    relatedAria: 'Pages associées',
  },
  gamesRoot: {
    h1: 'Les jeux les plus populaires sur Twitch et YouTube',
    methodologyNote:
      'Classés selon le nombre de streamers que nous suivons dans chaque catégorie sur les 28 derniers jours.',
    intro: (gameCount, liveStreamerCount, liveGameCount) => {
      const lead = `Nous suivons ${gameCount} jeu${gameCount === 1 ? '' : 'x'} et catégories sur Twitch et YouTube.`;
      const note =
        'Classés selon le nombre de streamers que nous suivons dans chaque catégorie sur les 28 derniers jours.';
      if (liveStreamerCount <= 0) return `${lead} ${note}`;
      const streamers = `${formatCompactNumber(liveStreamerCount, 'fr')} streamer${liveStreamerCount === 1 ? ' est' : 's sont'} en direct en ce moment`;
      const across =
        liveGameCount > 0
          ? ` dans ${liveGameCount} catégorie${liveGameCount === 1 ? '' : 's'}`
          : '';
      return `${lead} ${streamers}${across}. ${note}`;
    },
    faqPopularQ: 'Quel est le jeu le plus populaire sur Twitch et YouTube ?',
    faqPopularA: (top, second) =>
      `${top.category} rassemble le plus de streamers parmi ceux que nous suivons — ${top.count} chaîne${top.count === 1 ? " l'a" : "s l'ont"} streamé au cours des 28 derniers jours${second ? `, devant ${second.category} avec ${second.count}` : ''}.`,
    faqWhoQ: 'Qui streame en ce moment ?',
    faqWhoA: (liveStreamerCount, liveGameCount) =>
      `${liveStreamerCount} streamer${liveStreamerCount === 1 ? ' est' : 's sont'} en direct dans ${liveGameCount} catégorie${liveGameCount === 1 ? '' : 's'}. Ouvre une catégorie pour voir les chaînes en direct et leurs prochains streams.`,
    faqRankedQ: 'Comment ces jeux sont-ils classés ?',
    faqRankedA: (gameCount) =>
      `Classés selon le nombre de streamers que nous suivons dans chaque catégorie sur les 28 derniers jours. Les chiffres proviennent d'un agrégat nocturne des diffusions terminées sur ${gameCount} jeu${gameCount === 1 ? '' : 'x'} ; les données en direct se rafraîchissent toutes les quelques minutes.`,
    faqHoursQ: '« Heures streamées » signifie-t-il temps de visionnage ?',
    faqHoursA:
      `Non. Les heures streamées mesurent le temps passé en direct par les streamers dans une catégorie. Nous ne mesurons pas le temps de visionnage ; les spectateurs en direct affichés sur les cartes sont un échantillon instantané, pas un total.`,
  },
  rankings: {
    h1: 'Classements des streamers Twitch et YouTube',
    intro: (n) =>
      `Qui sont les streamers les plus suivis, ceux qui grandissent le plus vite, les plus actifs et les plus fiables sur Twitch et YouTube ? ${n} classements avec les stats de followers, de spectateurs et d'activité de tous les streamers que nous suivons — mis à jour chaque jour à partir de vraies données de diffusion.`,
    dataRefreshed: (label) => ` Données actualisées le ${label}.`,
    seeFullRanking: 'Voir le classement complet →',
    warmingUp: 'Les classements chauffent encore — reviens bientôt.',
    filterEmpty: 'Aucun streamer de ce classement ne correspond à ces filtres.',
    filterError: 'Le classement filtré n’a pas pu être chargé.',
    filterRetry: 'Réessayer',
    byGameHeading: 'Classements par jeu',
    byGameSubtitle: 'Les streamers les plus suivis pour chaque jeu et catégorie.',
    byGameAria: 'Classements de jeux populaires',
    topGameStreamers: (category) => `Meilleurs streamers ${category}`,
    gameChipStats: (category) => `Stats des streamers ${category}`,
    whoIsLive: 'Qui est en direct en ce moment ?',
    climbersThisWeek: 'Les plus fortes progressions de la semaine',
    metricH1: {
      'most-followed': 'Streamers les plus suivis',
      'fastest-growing': 'Streamers qui grandissent le plus vite',
      'most-watched': 'Streamers les plus regardés',
      'most-active': 'Streamers les plus actifs',
      'most-reliable': 'Streamers les plus ponctuels',
    },
    metricNote: {
      'most-followed':
        `Mis à jour chaque jour. Les nombres de followers et d'abonnés sont rafraîchis régulièrement et peuvent être en retard sur les chiffres en direct des plateformes.`,
      'fastest-growing':
        `Gain de followers (Twitch) ou d'abonnés (YouTube) sur les 7 derniers jours, à partir d'instantanés quotidiens de chaque chaîne suivie. Seules les chaînes en croissance positive sont classées. Mis à jour chaque jour.`,
      'most-watched':
        'Médiane des spectateurs simultanés en direct sur les 28 derniers jours (échantillonnage horaire). Mis à jour chaque jour.',
      'most-active':
        'Total des heures en direct sur les 28 derniers jours. Chaque stream est compté une fois ; les chaînes 24h/24 sont exclues. Mis à jour chaque jour.',
      'most-reliable':
        'Part des streams annoncés sur Twitch qui ont réellement commencé à ±30 minutes, sur les 20 derniers streams annoncés dans une fenêtre de 90 jours (minimum 10 évalués). Mis à jour chaque jour.',
    },
    tableColStreamer: 'Streamer',
    tableColMainGame: 'Jeu principal',
    tableColNextStream: 'Prochain stream',
    tableHeaders: {
      'Followers': 'Followers',
      'Avg viewers': 'Spectateurs moyens',
      'Gained (7d)': 'Gagnés (7 j)',
      'Growth': 'Croissance',
      'Followers now': 'Followers actuels',
      'Hours (28d)': 'Heures (28 j)',
      'Streams / week': 'Streams / semaine',
      'Avg duration': 'Durée moyenne',
      'On-time rate': 'Ponctualité',
      'Typical deviation': 'Écart typique',
      'Streams evaluated': 'Streams évalués',
    },
    trendNewLabel: 'nouveau',
    trendNewTitle: 'Absent de ce classement il y a une semaine',
    trendMoveTitle: (up, delta) =>
      `${up ? 'Gagne' : 'Perd'} ${delta} place${delta === 1 ? '' : 's'} depuis la semaine dernière`,
    mainGameShareTitle: (pct) => `${pct} % de ses streams catégorisés`,
    alwaysOnTitle: 'Chaîne always-on — en live 24 h/24',
    faqHeading: 'À propos de ces classements',
    faqCalculatedQ: 'Comment ces classements de streamers sont-ils calculés ?',
    faqCalculatedA:
      "Chaque classement est calculé à partir de vraies données de diffusion que nous collectons nous-mêmes : nombre de followers et d'abonnés, échantillonnage horaire des spectateurs en direct et historique des streams de chaque chaîne Twitch et YouTube suivie. Aucun chiffre autodéclaré.",
    faqUpdatedQ: 'À quelle fréquence les stats sont-elles mises à jour ?',
    faqUpdatedA:
      "Les classements sont recalculés chaque nuit — les stats de followers, de spectateurs et d'activité sont rafraîchies quotidiennement, tandis que les badges live et les prochains streams se mettent à jour au fil de la journée.",
    faqPlatformsQ: 'Quelles plateformes sont couvertes ?',
    faqPlatformsA:
      'Twitch et YouTube. La plupart des classements mélangent les deux plateformes — les followers Twitch correspondent aux abonnés YouTube. Le classement de ponctualité est réservé à Twitch, car il mesure les horaires annoncés sur Twitch.',
  },
  recaps: {
    metaTitleSuffix: 'Stats des streamers Twitch',
    weeklyKicker: 'Récap de la semaine',
    monthlyKicker: 'Récap du mois',
    readMore: 'Lire le récap complet',
    archiveTitle: 'Archives des récaps',
    archiveIntro:
      'Tous les récaps hebdomadaires et mensuels des classements : qui a grimpé, qui a grandi le plus vite et les clips que tout le monde a regardés.',
    allRecaps: 'Tous les récaps',
    backToRankings: 'Tous les classements',
    previousEdition: 'Édition précédente',
    nextEdition: 'Édition suivante',
    translationPending:
      "Cette édition n'est pas encore traduite — voici l'original en anglais.",
  },
  gamesExplorer: {
    sectionAria: 'Tous les jeux et catégories',
    sortAria: 'Trier les jeux',
    sortLabels: { streamers: 'Plus de streamers', hours: 'Les plus streamés', trending: 'Tendances' },
    viewTitles: {
      streamers: 'Les jeux les plus populaires sur Twitch et YouTube',
      hours: 'Les jeux les plus streamés sur Twitch et YouTube',
      trending: 'Jeux en tendance sur Twitch et YouTube',
    },
    searchPlaceholder: 'Rechercher des jeux…',
    searchAria: 'Rechercher des jeux',
    noMatch: 'Aucun jeu ne correspond à « {q} ».',
  },
  gameChips: {
    aria: (category) => `Statistiques ${category}`,
    streamersLabel: (n) => (n === 1 ? 'streamer' : 'streamers'),
    liveNowLabel: 'en live',
    watchingLabel: 'spectateurs',
    streamedLabel: 'de stream · 28 jours',
    streamsLabel: () => 'streams · 28 jours',
    peakLead: 'Pic de ',
    peakTail: ' spectateurs · 28 jours',
    trendTail: ' cette semaine',
    trendTitle: 'Évolution des streamers actifs par rapport à la semaine dernière',
  },
  game: {
    notFoundTitle: 'Jeu introuvable — Streamer Times',
    metaTitle: (category) => `Streamers ${category} — En live, classements et horaires`,
    metaDescription: (category, names) => {
      const tail = `Qui est en live, streams à venir et horaires prédits par IA sur Twitch et YouTube.`;
      const namesLead =
        names.length > 0
          ? `${listConjunction(names, 'fr')} ${names.length === 1 ? 'mène' : 'mènent'} le classement ${category}. `
          : '';
      const twoNamesLead =
        names.length > 1
          ? `${listConjunction(names.slice(0, 2), 'fr')} mènent le classement ${category}. `
          : '';
      return [
        `${namesLead}${tail}`,
        `${twoNamesLead}${tail}`,
        `Les streamers ${category} les plus suivis. ${tail}`,
        tail,
      ];
    },
    ogTitle: (category) => `Streamers ${category} — en live, classements et horaires`,
    ogDescription: (category, names) => {
      const ogNames = names.length > 0 ? ` — ${listConjunction(names, 'fr')} —` : ' :';
      return `Les streamers ${category} les plus suivis${ogNames} statut live et horaires de stream sur Twitch et YouTube.`;
    },
    h1: (category) => `Streamers ${category} — en live et horaires`,
    intro: (shown, category, liveCount, upcomingCount, superlative) =>
      `${shown} streamer${shown === 1 ? ' a' : 's ont'} des streams ${category} en live ou prévus cette semaine sur Twitch et YouTube. ` +
      (liveCount > 0
        ? `${liveCount} ${liveCount === 1 ? 'est' : 'sont'} en live en ce moment`
        : `Personne n'est en live en ce moment`) +
      (upcomingCount > 0
        ? `, avec ${upcomingCount} stream${upcomingCount === 1 ? '' : 's'} à venir dans les 7 prochains jours.`
        : '.') +
      superlative,
    superlative: (category, name, value, isTwitch) =>
      ` Le streamer ${category} le plus suivi ici est ${name}, avec ${value} ${isTwitch ? 'followers' : 'abonnés'}.`,
    onPageAria: 'Sur cette page',
    navLiveNow: 'En live',
    navTopStreamers: 'Top streamers',
    navBestTimes: 'Meilleurs créneaux',
    navSchedule: 'Horaires',
    navRelated: 'Jeux similaires',
    followGame: (category) => `Suivre ${category}`,
    followingLabel: 'Suivi',
    watchingNow: (category) => `${category} en live maintenant`,
    liveStreamsAria: (category) => `Streams ${category} en live`,
    moreLiveAria: (category) => `Autres streams ${category} en live`,
    showMoreLive: (n) =>
      n === 1 ? 'Voir 1 chaîne de plus en live' : `Voir ${n} chaînes de plus en live`,
    moreLiveInRanking: (n, category) =>
      `${n} de plus en live dans le classement ${category} complet →`,
    liveUpdatesNote:
      'Le statut live et les spectateurs se mettent à jour toutes les quelques minutes.',
    mostFollowed: (category) => `Streamers ${category} les plus suivis`,
    tableCaption: (category) =>
      `Streamers ${category} classés par followers, avec leur prochain stream attendu`,
    thRank: '#',
    thStreamer: 'Streamer',
    thNextStream: 'Prochain stream',
    thFollowers: 'Followers',
    thHours: 'Heures / 28 j',
    liveNowCell: 'En live',
    seeFullRanking: (category) =>
      `Voir le classement ${category} complet (top 50) →`,
    whoStreams: (category) => `Streamers qui streament ${category}`,
    whenStreamed: (category) => `Quand est-ce que ${category} est streamé ?`,
    heatmapSummary: (category) =>
      `La plupart des streams ${category} tournent {peak}{tz} — d'après les 4 dernières semaines de streams suivis.`,
    heatmapSummaryEmpty: `D'après les 4 dernières semaines de streams suivis.`,
    tzLocalSuffix: ' (ton heure)',
    tzUtcSuffix: ' (UTC)',
    heatmapAria: (category) => `Heatmap hebdomadaire des streams ${category}.`,
    heatmapAriaWithPeak: (category) =>
      `Heatmap hebdomadaire des streams ${category}. Créneau le plus actif : {peak}.`,
    heatmapTooltip: '{day} {from}–{to} · {amount} de stream en 4 semaines',
    legendLess: 'Moins',
    legendMore: 'Plus',
    heatmapDayNames: [
      'le lundi',
      'le mardi',
      'le mercredi',
      'le jeudi',
      'le vendredi',
      'le samedi',
      'le dimanche',
    ],
    bestTimeToStream: (category) => `Meilleur moment pour streamer ${category}`,
    trendingBadge: '▲ Tendance',
    bestTimeIntro: (category) =>
      `Pour les streamers : les créneaux où ${category} compte le plus de spectateurs par chaîne en live.`,
    fullHeatmapLink: `Heatmap d'opportunités et analyse complète →`,
    bestSlotsAria: 'Meilleurs créneaux',
    viewersPerChannel: '~{score} spectateurs/chaîne',
    timesLocalNote: 'Heures dans ton fuseau horaire.',
    timesUtcNote: 'Heures en UTC.',
    quietTitle: (category) => `Aucun stream ${category} en ce moment`,
    quietBody: (category) =>
      `Aucun des streamers ${category} que nous suivons n'est en live ou attendu dans les 7 prochains jours. Les horaires et prédictions IA se mettent à jour plusieurs fois par jour — reviens bientôt.`,
    quietMeanwhile: 'En attendant',
    seeWhosLive: 'Voir qui est en live →',
    browseAllGames: 'Parcourir tous les jeux',
    gameStreamersChip: (category) => `Streamers ${category}`,
    scheduleAria: (category) => `Horaires des streams ${category}`,
    upcomingStreams: (category) => `Streams ${category} à venir`,
    scheduleNote:
      `Les heures s'adaptent à ton fuseau horaire, avec l'heure du streamer à côté. Les jours suivent le calendrier UTC, donc un stream tard dans la nuit peut apparaître sous le jour suivant.`,
    filterAria: 'Filtrer les horaires',
    allPlatforms: 'Toutes les plateformes',
    hideLowConfidence: 'Masquer probabilité faible',
    moreLowConfidence: (n) =>
      n === 1
        ? '1 prédiction de plus à probabilité faible'
        : `${n} prédictions de plus à probabilité faible`,
    lowConfAria: (label) => `Prédictions à probabilité faible : ${label}`,
    hiddenNotShown: (n) =>
      n === 1
        ? `1 prédiction de plus n'est pas affichée pour ce jour. Ouvre la page du streamer pour son horaire complet.`
        : `${n} prédictions de plus ne sont pas affichées pour ce jour. Ouvre la page du streamer pour son horaire complet.`,
    relatedGames: 'Jeux similaires',
    relatedGamesAria: 'Jeux similaires',
    relatedNote:
      'Jeux dont les streamers se recoupent sur les 28 derniers jours.',
    allGamesFooter: '← Tous les jeux et catégories',
  },
  gameRanking: {
    notFoundTitle: 'Introuvable — Streamer Times',
    metaTitle: (category, page) =>
      page === 1
        ? `Top streamers ${category} — classés par followers`
        : `Top streamers ${category} — classés par followers — Page ${page}`,
    metaLeadIn: (name, value) => `${name} mène avec ${value} followers. `,
    metaDescription: (category, leadIn) => [
      `${leadIn}Les meilleurs streamers ${category} sur Twitch et YouTube, classés par followers, avec statut live et prochains streams. Mis à jour chaque jour.`,
      `${leadIn}Les meilleurs streamers ${category} par followers, avec statut live et prochains streams.`,
      `Les meilleurs streamers ${category} sur Twitch et YouTube, classés par followers, avec statut live et prochains streams. Mis à jour chaque jour.`,
    ],
    ogTitle: (category) => `Top streamers ${category} — classés par followers`,
    h1: (category) => `Top streamers ${category} par followers`,
    introPage1: (count, category) =>
      `Les ${count} meilleurs streamers ${category} que nous suivons, classés par followers et abonnés de la chaîne.`,
    topsTheList: (name, value, isTwitch) =>
      ` ${name} est en tête avec ${value} ${isTwitch ? 'followers' : 'abonnés'}.`,
    introPageN: (from, to, total, category) =>
      `Rangs ${from}–${to} sur ${total} streamers ${category} que nous suivons, classés par followers et abonnés de la chaîne.`,
    methodology: (category) =>
      `Streamers actifs dans ${category} sur les 28 derniers jours, classés par followers. Les chiffres sont rafraîchis régulièrement et peuvent être en retard sur les plateformes.`,
    followersRefreshed: (label) => ` Followers mis à jour : ${label}.`,
    warmingUp:
      `Ce classement chauffe encore — il nous faut un peu plus de données avant qu'il soit parlant. Reviens bientôt.`,
    missingDataNote:
      `— signifie que nous n'avons pas encore assez de données pour cette chaîne, par exemple l'échantillonnage des spectateurs pour les chaînes fraîchement ajoutées.`,
    sortAria: 'Trier le classement',
    sortFollowers: 'Plus suivis',
    sortHours: `Plus d'heures (28 j)`,
    sortViewers: 'Plus regardés',
    filterLangAria: 'Filtrer par langue',
    allChip: 'Tous',
    noMatch: 'Aucun streamer ne correspond à ce filtre.',
    tableCaption: (category) => `Streamers ${category} classés par followers`,
    thRank: '#',
    thStreamer: 'Streamer',
    thFollowers: 'Followers',
    thAvgViewers: 'Spectateurs moy.',
    thHours: 'Heures (28 j)',
    thShare: 'Part du jeu',
    thShareTitle: (category) =>
      `Part des derniers streams du streamer consacrés à ${category}`,
    thNextStream: 'Prochain stream',
    liveNowCell: 'En live',
    watchingTail: ' · {value} spectateurs',
    trendNewBadge: 'nouveau',
    trendNewTitle: `N'était pas dans ce classement il y a une semaine`,
    trendUpTemplate: 'Monte de {n} depuis la semaine dernière',
    trendDownTemplate: 'Descend de {n} depuis la semaine dernière',
    mainGameTemplate: 'Jeu principal : {share}% de ses derniers streams',
    aboutRanking: 'À propos de ce classement',
    faqMostFollowedQ: (category) =>
      `Quel streamer ${category} a le plus de followers ?`,
    faqMostFollowedA: (category, top, second) => {
      const runnerUp = second ? `, devant ${second.name} avec ${second.value}` : '';
      return `${top.name} est actuellement le streamer ${category} le plus suivi parmi ceux que nous suivons, avec ${top.value} ${top.isTwitch ? 'followers' : 'abonnés'}${runnerUp}. Les chiffres sont mis à jour chaque jour.`;
    },
    faqHowManyQ: (category) => `Combien de streamers streament ${category} ?`,
    faqHowManyA: (category, count, activity) => {
      const tail = activity
        ? ` Ensemble, ils ont streamé environ ${activity.hours} heures de ${category} sur ${activity.streams} streams au cours des 28 derniers jours.`
        : '';
      return `Nous suivons actuellement ${count} streamer${count === 1 ? '' : 's'} qui ont streamé ${category} récemment ou l'ont à leur programme.${tail}`;
    },
    faqMeasuredQ: 'Comment ce classement est-il mesuré ?',
    faqMeasuredA: (category) =>
      `Streamers actifs dans ${category} sur les 28 derniers jours, classés par les followers de leur chaîne principale — followers de la chaîne sur Twitch ou abonnés sur YouTube. Les colonnes heures et part viennent d'un agrégat nocturne des streams ${category} terminés.`,
    faqShareQ: 'Que signifie « Part du jeu » ?',
    faqShareA: (category) =>
      `La part des derniers streams d'un streamer consacrés à ${category}. 100 % signifie que c'est actuellement son seul jeu ; une part faible marque un visiteur occasionnel de la catégorie.`,
    relatedRankings: 'Classements similaires',
    relatedRankingsAria: 'Classements de jeux similaires',
    liveAndSchedule: (category) => `En live et horaires de ${category} →`,
    allRankings: 'Tous les classements',
    paginationAria: (category) => `Pages du classement ${category}`,
    prev: '← Précédent',
    next: 'Suivant →',
  },
};
