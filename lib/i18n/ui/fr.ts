import type { UiLex } from '../types';

// French — tu-form (registre streaming), espaces insécables simplifiées en
// espaces normales avant « : » / « ? » pour rester proche du rendu web usuel.
export const fr: UiLex = {
  breadcrumb: {
    home: 'Accueil',
    streamers: 'Streamers',
  },
  hero: {
    featured: 'À la une',
    nowStreaming: 'En stream :',
    avatarAlt: (name) => `Avatar de ${name}`,
    showMore: 'Voir plus',
    showLess: 'Voir moins',
  },
  promo: {
    valueProps: [
      'Enregistre tes streamers préférés',
      'Sois averti dès qu’ils passent en live',
      'Ajoute n’importe quel streamer en quelques secondes',
    ],
    qrAria: 'QR code — scanne-le avec ton téléphone pour installer l’app Streamer Times',
    getApp: 'Télécharger l’app',
  },
  lastStream: {
    heading: 'Dernier stream',
    pastStream: 'Stream passé',
    watchVod: 'Voir le VOD →',
    watchAria: (name, title) => `Voir le dernier stream de ${name} : ${title}`,
  },
  recent: {
    heading: 'Streams récents',
    vodAria: (title) => `Voir le VOD : ${title}`,
  },
  channelStats: {
    heading: 'Stats de la chaîne',
    followers: 'Followers',
    subscribers: 'Abonnés',
    avgViewers: 'Spectateurs moyens',
    medianDetail: 'médiane sur 28 jours',
    peakViewers: 'Pic de spectateurs',
    hoursStreamed: 'Heures streamées',
    lastNDays: (n) => `${n} derniers jours`,
  },
  streamerRankings: {
    heading: 'Classements',
    intro: (name) => `La place de ${name} dans nos classements de streamers.`,
    ofTotal: (total) => `sur ${total}`,
    metric: {
      'most-followed': 'Plus suivis',
      'most-watched': 'Plus regardés',
      'most-active': 'Plus actifs',
      'most-reliable': 'Plus ponctuels',
      'fastest-growing': 'Croissance la plus rapide',
    },
    rowAria: (rank, total, label) => `Place ${rank} sur ${total} en ${label}`,
    trendUp: (p) => `${p} ${p === 1 ? 'place gagnée' : 'places gagnées'} depuis la semaine dernière`,
    trendDown: (p) => `${p} ${p === 1 ? 'place perdue' : 'places perdues'} depuis la semaine dernière`,
    byCategory: 'Par catégorie',
    summary: (name, parts) => `${name} est ${parts.join(' et ')} sur Streamer Times.`,
  },
  stats: {
    heading: (name) => `Quand est-ce que ${name} streame ?`,
    // `tz` is the cityTime label ("heure de Berlin") — parenthetical/colon
    // constructions read better than "affichés en heure de …".
    caption: (name, tz) =>
      `Horaires de stream habituels de ${name} par jour de la semaine (${tz})`,
    colDay: 'Jour',
    colTime: 'Heure habituelle',
    colDuration: 'Durée',
    usuallyNoStream: 'Généralement pas de stream',
    streamsPerWeek: 'Streams par semaine',
    typicalLength: 'Durée typique d’un stream',
    topCategories: 'Catégories les plus streamées',
    basedOn: (n, d) => `D’après ${n} streams sur les ${d} derniers jours.`,
    allTimesIn: (tz) => `Fuseau horaire des heures affichées : ${tz}`,
    cityTime: (city) => `heure de ${city}`,
    tzToggleYour: 'Ton heure',
    tzToggleAria: 'Afficher les heures en',
    leadSentence: (name, days, times) => {
      const dayWord = days === 1 ? 'jour' : 'jours';
      const base = `${name} streame généralement ${days} ${dayWord} par semaine`;
      return times
        ? `${base}, le plus souvent entre ${times.start} et ${times.end} (${times.tzLabel}).`
        : `${base}.`;
    },
  },
  faq: {
    heading: 'Questions fréquentes',
    qIsLive: (name) => `Est-ce que ${name} est en live en ce moment ?`,
    aIsLiveCat: (name, cat, platforms) =>
      `Oui — ${name} est en live en ce moment sur ${platforms} et streame ${cat}.`,
    aIsLive: (name, platforms) => `Oui — ${name} est en live en ce moment sur ${platforms}.`,
    qUsually: (name) => `Quand est-ce que ${name} streame d’habitude ?`,
    typicallyLast: (duration) => `Les streams durent en général environ ${duration}.`,
    qSchedule: (name) => `Quel est le planning des streams de ${name} ?`,
    aScheduleLead: (name, n) =>
      n === 1
        ? `${name} a 1 stream au planning pour les 7 prochains jours.`
        : `${name} a ${n} streams au planning pour les 7 prochains jours.`,
    nextUp: (entry) => `Prochain stream : ${entry}.`,
    afterThat: (list) => `Ensuite : ${list}.`,
    plusMore: (n) =>
      n === 1
        ? `Plus 1 autre — voir le planning complet ci-dessus.`
        : `Plus ${n} autres — voir le planning complet ci-dessus.`,
    // Colon construction like stats.allTimesIn — avoids "indiquées en heure de …".
    allTimesNote: (tz) => `Toutes les heures indiquées : ${tz}.`,
    predictedNote:
      'Les horaires marqués comme prédictions sont estimés par IA à partir des habitudes de stream passées.',
    outsideDates: (name, time, tz) =>
      `En dehors de ces dates, ${name} lance généralement son live vers ${time} (${tz}) — voir les horaires habituels ci-dessus.`,
    predictedMarker: 'prédiction',
    qGames: (name) => `À quels jeux joue ${name} en stream ?`,
    aGamesOne: (name, cat) =>
      `${name} streame actuellement ${cat}. Consulte le planning ci-dessus pour les prochains streams.`,
    aGamesMany: (name, list) =>
      `${name} streame ${list}. Consulte le planning ci-dessus pour voir la suite.`,
    qHowOften: (name) => `À quelle fréquence ${name} streame ?`,
    aAlwaysOn: (name, platforms) =>
      `${name} streame 24h/24 et 7j/7 — la chaîne est toujours en live sur ${platforms}.`,
    aPerWeek: (name, perWeek, windowDays) =>
      `${name} streame environ ${perWeek} fois par semaine en moyenne, d’après les diffusions des ${windowDays} derniers jours.`,
    aScheduleCount: (name, n, daysList) => {
      const base =
        n === 1
          ? `${name} a 1 stream au planning pour les 7 prochains jours`
          : `${name} a ${n} streams au planning pour les 7 prochains jours`;
      return daysList ? `${base}, le ${daysList}.` : `${base}.`;
    },
    qWhere: (name) => `Où regarder ${name} ?`,
    aWhere: (name, platforms) =>
      `${name} streame en direct sur ${platforms}. Ajoute ${name} sur Streamer Times pour suivre son statut live et ses prochains streams au même endroit.`,
    qTimezone: (name) => `Dans quel fuseau horaire streame ${name} ?`,
    aTimezone: (name, tzCity) =>
      `${name} vit dans le fuseau horaire de ${tzCity}. Le planning de cette page affiche chaque stream dans ton heure locale et dans l’heure locale de ${name}.`,
    qPredicted: (name) => `Les horaires de ${name} sont-ils prédits ou confirmés ?`,
    aAllPredicted: (name) =>
      `Les prochains horaires de ${name} sont des prédictions d’IA basées sur ses habitudes de stream, chacune avec un niveau de probabilité élevé, moyen ou faible. Les horaires confirmés apparaissent ici dès qu’ils sont annoncés.`,
    aMixed: (name, predicted, total) =>
      `Le planning de ${name} mélange prédictions d’IA et streams confirmés. ${predicted} des ${total} prochains horaires sont prédits à partir des habitudes passées, avec leur niveau de probabilité.`,
  },
  empty: {
    heading: 'Aucun stream prévu',
    body: (name, platforms) =>
      `Nous suivons les lives de ${name} sur ${platforms}. Les prédictions d’IA et les horaires confirmés apparaîtront ici dès qu’il y aura assez d’historique.`,
    browseAll: 'Parcourir tous les streamers',
  },
  related: {
    heading: 'Streamers similaires',
    liveNowSr: '(en live)',
  },
  games: {
    heading: 'Jeux',
    navAria: 'Jeux auxquels ce streamer joue',
  },
  wiki: {
    teaserTitle: 'Wiki & infos',
    teaserSub: (name, parts) => `${parts} : le profil wiki de ${name}`,
    breadcrumb: 'Wiki',
    heading: (name) => `${name} Wiki`,
    metaTitle: (name, year, parts) => `${name} Wiki ${year} : ${parts}`,
    titlePart: {
      age: 'âge',
      netWorth: 'fortune',
      earnings: 'revenus',
      realName: 'vrai nom',
      career: 'carrière',
      facts: 'infos',
    },
    titleSep: ', ',
    titleAnd: ' et ',
    updated: (date) => `Mis à jour le ${date}`,
    factsHeading: "L'essentiel",
    factLabel: {
      real_name: 'Vrai nom',
      birth_date: 'Naissance',
      birthplace: 'Lieu de naissance',
      residence: 'Résidence',
      nationality: 'Nationalité',
      relationship_status: 'Situation amoureuse',
      net_worth_usd: 'Fortune (est.)',
      est_income_monthly_usd: 'Revenus mensuels (est.)',
      career_start: 'Streame depuis',
      teams: 'Équipes & orgs',
      height_cm: 'Taille',
    },
    relationship: {
      single: 'Célibataire',
      in_relationship: 'En couple',
      engaged: 'Fiancé(e)',
      married: 'Marié(e)',
      divorced: 'Divorcé(e)',
      widowed: 'Veuf/veuve',
    },
    ageSuffix: (age) => `${age} ans`,
    estimate: 'estimation',
    asOf: (when) => `en ${when}`,
    sectionCareer: 'Carrière',
    sectionPersonalLife: 'Vie privée',
    sectionEarnings: 'Revenus & fortune',
    sectionContentStyle: 'Contenu et style',
    sectionCommunity: 'Communauté',
    sectionAwards: 'Récompenses et records',
    timelineHeading: 'Chronologie',
    linksLabel: 'Liens officiels',
    aboutHeading: (name) => `À propos de ${name}`,
    nextStreamHeading: 'Prochain stream',
    fullSchedule: (name) => `Voir le programme complet de ${name}`,
    sourcesHeading: 'Sources',
    minorNote: 'Pour les streamers de moins de 18 ans, nous ne publions que des informations liées à leur carrière.',
    disclaimerHeading: 'À propos de cette page',
    disclaimer: (name) =>
      `Ce profil wiki a été établi à partir de sources publiques. Les chiffres comme la fortune ou les revenus sont des estimations de tiers, pas des valeurs vérifiées ; les informations personnelles correspondent à ce que ${name} ou des médias établis ont rendu public.`,
    disclaimerContact:
      'Tu es ce streamer et tu veux corriger ou retirer quelque chose ? Écris-nous :',
    earningsFallback: (name, range, asOf) =>
      `Streamer Times estime les revenus de ${name} à ${range} par mois${asOf ? ` (en ${asOf})` : ''}, d'après les spectateurs mesurés et les heures diffusées.`,
    earningsMethodology: 'Comment cette estimation est calculée',
    numbersHeading: 'En chiffres',
    numbersNote: (days) =>
      `Les médianes de spectateurs viennent de mesures horaires pendant le live ; l'activité couvre les ${days} derniers jours.`,
    numberLabel: {
      medianViewers: 'Spectateurs (médiane)',
      streamsPerWeek: 'Streams par semaine',
      activeDays: 'Jours actifs par semaine',
      typicalLength: 'Durée typique',
      followerGain30: 'Followers gagnés, 30 jours',
    },
    streamTimesHeading: (name) => `Quand streame ${name} ?`,
    reliabilityLabel: 'Fiabilité du planning',
    reliabilityTier: { reliable: 'Fiable', medium: 'Moyenne', unreliable: 'Peu fiable' },
    charts: {
      weekdayHeading: 'Médiane de spectateurs par jour',
      weekdayNote: 'Les jours suivent le calendrier UTC.',
      hourHeading: 'Médiane de spectateurs par heure',
      tzGroupAria: 'Fuseau horaire du graphique horaire',
      yourTime: 'Votre heure',
      streamerTime: 'Heure du streamer',
      streamerTimeNote: "Heure locale du streamer ({tz}).",
      yourTimeNote: 'Votre heure locale.',
      utcNote: 'UTC.',
      legendCold: 'Faible',
      legendPrime: 'Prime time',
      legendFaded: 'atténué = peu de mesures',
      weekdayAria: 'Médiane de spectateurs simultanés par jour de la semaine',
      hourAria: 'Médiane de spectateurs simultanés par heure',
      tooltip: "{label} · médiane {median} spectateurs ({samples} mesures)",
      noData: "{label} · pas de données",
      followersNow: 'maintenant',
      followersLow: 'minimum',
      followerAria: "Nombre de followers du {from} au {to}",
    },
    gamesNote: (days) => `Part des streams catégorisés sur les ${days} derniers jours.`,
    gamesColGame: 'Jeu',
    gamesColShare: 'Part',
    gamesColStreams: 'Streams',
    gamesColRank: 'Rang',
    clipsHeading: 'Moments marquants',
    clipsIntro: (name) => `Les clips les plus vus des streams de ${name}.`,
    clipViews: (views) => `${views} vues`,
    clipAria: (title) => `Voir le clip « ${title} » sur Twitch`,
    recapsHeading: 'Dans les récaps',
    recapsIntro: (name) =>
      `Éditions de nos récaps hebdomadaires et mensuels où ${name} figurait parmi les protagonistes.`,
    historyHeading: 'Historique',
    historyNote:
      'Mois par mois, d’après nos mesures : streams, heures, jeu principal et audience. Les mois marqués par un changement notable reçoivent un court résumé.',
    historyColMonth: 'Mois',
    historyColStreams: 'Streams',
    historyColHours: 'Heures',
    historyColTopGame: 'Jeu principal',
    historyColFollowers: 'Abonnés',
    historyColViewers: 'Spectateurs (médiane)',
    historyShowYear: (year) => `Afficher ${year}`,
    changesHeading: 'Modifications',
    changeAdded: (label, value) => `Ajout de ${label} : ${value}`,
    changeChanged: (label, from, to) => `${label} modifié de ${from} à ${to}`,
    changeRemoved: (label) => `Suppression de ${label}`,
    changeIncomeRefreshed: (from, to) => `Revenu mensuel estimé mis à jour de ${from} à ${to}`,
    changeIncomeRemoved: 'Revenu mensuel estimé retiré (données insuffisantes)',
    changeSections: (sections) => `Sections réécrites : ${sections}`,
    sectionSummary: 'Introduction',
    tocLabel: 'Sur cette page',
    tocAbout: 'Présentation',
    tocStreamTimes: 'Horaires',
    tocGames: 'Jeux',
    articleLanguageNote: "Cet article n'est pas encore disponible en français, il est affiché en anglais.",
  },
};
