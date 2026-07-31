import { formatCompactNumber } from '@/lib/format/number';
import type { HubLex } from './types';

export const fr: HubLex = {
  crumbs: {
    aria: `Fil d'Ariane`,
    home: 'Accueil',
    liveNow: 'En direct maintenant',
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
    quickFactsTitle: 'En bref',
    quickFactsSub: 'Sur les 7 derniers jours de streams suivis',
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
        'Alertes push dès que tes streamers passent en direct',
        'Widget des prochains streams sur ton écran d’accueil',
        'Favoris synchronisés — mobile et web',
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
      'Les plus gros jeux sur Twitch en ce moment — nos streamers ne les couvrent pas encore tous.',
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
    h1: 'Classements des streamers',
    intro: (n) =>
      `Qui sont les streamers les plus suivis, ceux qui grandissent le plus vite, les plus actifs et les plus fiables sur Twitch et YouTube ? ${n} classements couvrant tous les streamers que nous suivons — mis à jour chaque jour à partir de vraies données de diffusion.`,
    dataRefreshed: (label) => ` Données actualisées le ${label}.`,
    statStreamersTracked: 'streamers suivis',
    statLiveNow: 'en direct maintenant',
    statGamesCategories: 'jeux et catégories',
    seeFullRanking: 'Voir le classement complet →',
    warmingUp: 'Les classements chauffent encore — reviens bientôt.',
    byGameHeading: 'Classements par jeu',
    byGameSubtitle: 'Les streamers les plus suivis pour chaque jeu et catégorie.',
    byGameAria: 'Classements de jeux populaires',
    topGameStreamers: (category) => `Meilleurs streamers ${category}`,
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
  },
};
