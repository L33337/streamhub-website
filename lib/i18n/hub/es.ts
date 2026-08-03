import { formatCompactNumber } from '@/lib/format/number';
import { listConjunction } from '@/lib/i18n-core';
import type { HubLex } from './types';

export const es: HubLex = {
  crumbs: {
    aria: 'Ruta de navegación',
    home: 'Inicio',
    liveNow: 'En directo ahora',
    games: 'Juegos',
    streamers: 'Streamers',
    rankings: 'Rankings',
    pageN: (n) => `Página ${n}`,
  },
  common: {
    browseStreamersAZ: 'Todos los streamers de la A a la Z',
    allGamesCategories: 'Todos los juegos y categorías',
  },
  home: {
    browseAllGames: 'Explora todos los juegos y categorías →',
    seeLiveNow: 'Mira quién está en directo ahora mismo →',
  },
  homeFeed: {
    ticker: (liveCount, soonCount, soonHours) => {
      const live =
        liveCount > 0
          ? `${liveCount} streamer${liveCount === 1 ? '' : 's'} en directo ahora`
          : '';
      const soon =
        soonCount > 0 ? `${soonCount} empiezan en las próximas ${soonHours} horas` : '';
      return live && soon ? `${live} · ${soon}` : live || soon;
    },
    liveTitle: 'Los más vistos ahora mismo',
    liveFilterCategory: 'Categoría',
    liveFilterLanguage: 'Idioma',
    liveFilterAllCategories: 'Todas las categorías',
    liveFilterAllLanguages: 'Todos los idiomas',
    liveFilterOption: (label, count) => `${label} (${count})`,
    liveFilterMatches: (count) => `${count} directos`,
    liveFilterReset: 'Restablecer',
    liveFilterEmpty: 'Ningún directo coincide con estos filtros ahora mismo.',
    liveFilterNote: (top, total) =>
      `Top ${top} por espectadores actuales — los filtros buscan entre los ${total} directos`,
    upNextTitle: 'La programación de hoy',
    upNextLink: 'En directo y a punto de empezar →',
    lineupFilterTime: 'Hora',
    lineupFilterAllTimes: 'Cualquier hora',
    lineupFilterFrom: (time) => `Desde ${time}`,
    lineupFilterMatches: (count) =>
      `${count} ${count === 1 ? 'emisión' : 'emisiones'}`,
    lineupFilterEmpty: 'Ninguna emisión coincide con estos filtros.',
    chipAll: 'Todos',
    chipFavorites: 'Mis favoritos',
    lineupShowAll: (n) => `Mostrar los ${n} streams`,
    lineupShowMore: (n) => `Mostrar ${n} más`,
    lineupShowLess: 'Mostrar menos',
    bellAria: (name) => `Recibe un aviso cuando ${name} esté en directo`,
    upsell: {
      bellTitle: 'No te pierdas ningún stream',
      bellBody:
        'Recibe una notificación push justo antes de que empiece un stream — con la app gratuita de Streamer Times.',
      favoritesTitle: 'Tus favoritos, a un toque',
      favoritesBody:
        'Sigue a streamers y filtra esta página hasta tu propia programación — gratis, en la app o aquí mismo en el navegador.',
      appCta: 'Descargar la app',
      loginCta: 'Inicia sesión gratis',
      close: 'Quizá más tarde',
    },
    interrupt: {
      title: 'Esta página — solo con tus streamers.',
      body: 'Sigue a tus streamers y la guía se convierte en tu feed personal: tu programación, avisos push justo antes de que empiecen y sus mejores momentos de la semana.',
      note: 'Tarda 30 segundos · gratis',
      appCta: 'Descargar la app',
      loginCta: 'Inicia sesión en la web',
    },
    clipsTitle: 'Clips de la semana',
    clipsFilterMatches: (count) => `${count} ${count === 1 ? 'clip' : 'clips'}`,
    clipsFilterEmpty: 'Ningún clip coincide con estos filtros.',
    quickFactsTitle: 'Datos rápidos',
    quickFactsSub: 'Cifras de los streams que registramos',
    factPredictionLabel: 'Chequeo de predicciones',
    factPrediction: (hits, total) =>
      `En ${hits} de ${total} predicciones de probabilidad alta, el stream empezó a menos de dos horas de lo previsto.`,
    factPeakLabel: 'Pico de la semana',
    factPeak: (name) =>
      `${name} alcanzó el máximo de espectadores simultáneos esta semana.`,
    factReliableLabel: 'Puntualidad',
    factReliable: (name, hits, total) =>
      `${name} empezó a tiempo ${hits} de sus últimos ${total} streams anunciados.`,
    factPauseLabel: 'De descanso',
    factPause: (name) => `${name} está de descanso hasta esta fecha.`,
    factMarathonLabel: 'Maratón de la semana',
    factMarathon: (name) => `${name} estuvo en directo todo ese tiempo del tirón.`,
    factComebackLabel: 'Regreso de la semana',
    factComeback: (name, days) => `${name} vuelve tras ${days} días sin stream.`,
    factPrimeTimeLabel: 'Hora punta',
    factPrimeTime: (total) =>
      `A esta hora empiezan más streams que a ninguna otra, sobre ${total} streams en 4 semanas.`,
    factBusiestDayLabel: 'Día más cargado',
    factBusiestDay: (total) =>
      `El día de la semana en que empiezan más streams, sobre ${total} streams en 4 semanas.`,
    factLocalTimeNote: 'tu zona horaria',
    factUtcNote: 'UTC',
    factTopCategoryLabel: 'Categoría de la semana',
    factTopCategory: (category, streamers) =>
      `Streams de ${category} en los últimos 7 días, de ${streamers} ${streamers === 1 ? 'streamer' : 'streamers'}.`,
    factCompetitionLabel: 'Nivel de competencia',
    factCompetition: (category) =>
      `Canales registrados en directo en ${category} a la vez, de media: la categoría más concurrida que seguimos.`,
    factRoomLabel: 'Hueco libre',
    factRoom: (category, channels) =>
      `Espectadores por canal en ${category}, con solo ${channels} canales registrados en directo a la vez.`,
    factRoomSlotLabel: 'Mejor momento',
    risersTitle: 'Los que más suben esta semana',
    risersLink: 'Todos los rankings →',
    risersGained: (delta) => `${delta} seguidores en 7 días`,
    mostStreamedTitle: 'Los que más streamearon esta semana',
    weekHours: (value) => `${value} h en directo · 7 días`,
    weekStreams: (n) => `${n} stream${n === 1 ? '' : 's'}`,
    mostWatchedTitle: 'Los más vistos',
    topStreamersCol: 'Top 5 streamers',
    topCategoriesCol: 'Top 5 categorías',
    medianViewers: (value) => `${value} espectadores (mediana)`,
    hoursStreamed: (value) => `${value} h en directo · 28 días`,
    followers: (value) => `${value} seguidores`,
    missingStreamer: '¿Falta tu streamer? Búscalo y añádelo →',
    endcap: {
      title: 'Llévate tu programación contigo.',
      bullets: [
        'Sigue a tus streamers favoritos',
        'Mira quién entra en directo y cuándo',
        '¡Stats, clips y mucho más!',
      ],
      webLead: '¿Prefieres el navegador?',
      webLink: 'Crea una cuenta gratis',
      webTail: '— tu feed te espera.',
    },
    sessionBanner: {
      text: 'Bienvenido de nuevo — tu feed personal está listo.',
      cta: 'Ir a mi feed →',
    },
    sectionNav: {
      aria: 'Ir a una sección',
      live: 'En directo',
      lineup: 'Hoy',
      trending: 'Tendencias',
      clips: 'Clips',
      stats: 'Cifras',
      discover: 'Streamers',
    },
  },
  hero: {
    claim: 'Programación. Clips. Estadísticas. Todo en un mismo sitio.',
    ctaLogin: 'Inicia sesión',
    ctaMid: ' o ',
    ctaApp: 'descarga la app',
    ctaTail: ' para seguir a tus streamers favoritos.',
    ctaAppOnlyLink: 'Descarga la app',
    ctaAppOnlyTail: ' para seguir a tus streamers favoritos.',
    kicker: 'Guía de streamers en directo',
    badgeNew: 'Nuevo',
    badgeLive: 'Ya disponible en iOS y Android',
    titleLead: 'Horarios de streams en directo de ',
    titleTail: '',
    subtitle: 'La guía TV de los streamers.',
    bodyLead:
      'Un solo feed para Twitch y YouTube. Estado en directo en tiempo real, próximos streams predichos por IA y cero ruido. Gratis y sin cuenta:',
    bodyLink: 'descarga la app',
    bodyTail: 'para recibir alertas en directo.',
    appStoreSub: 'Descargar en el',
    playSub: 'DISPONIBLE EN',
    phoneAlt: 'Una streamer mirando la programación de esta noche en su móvil',
    phoneCaption: 'Mirando el lineup de esta noche',
    statBothLabel: 'Dos plataformas, una sola guía',
    statFavoritesValue: 'Tus favoritos',
    statFavoritesLabel: 'Añade cualquier canal en segundos',
    statApiValue: 'API pública',
    statApiLabel: 'Muy pronto · únete a la lista de espera',
  },
  upcoming: {
    heading: 'Próximamente',
    aria: 'Próximos streams',
    empty: 'No hay nada programado ahora mismo — vuelve pronto.',
  },
  trending: {
    heading: 'Tendencias en Twitch',
    subtitle:
      'Lo que está viendo todo Twitch ahora mismo.',
    aria: 'Juegos en tendencia en Twitch',
    rankOnTwitch: (rank) => `#${rank} en Twitch`,
    sortAria: 'Ordenar juegos',
    sortTwitch: 'Twitch',
    sortHours: 'Horas',
    sortViewers: 'Espectadores',
    sortStreamers: 'Streamers',
    liveViewers: (value) => `${value} viendo ahora`,
    streamerCount: (value, count) => `${value} ${count === 1 ? 'streamer' : 'streamers'}`,
  },
  popular: {
    heading: 'Streamers populares',
    viewAll: 'Ver todos los streamers →',
  },
  streamerWiki: {
    heading: 'Streamer Wiki',
    subline: 'Quiénes son, a qué juegan y cuándo se ponen en directo.',
    viewAll: 'Explorar todos los streamers →',
    followers: (value) => `≈${value} seguidores`,
    streams28d: (count) => `${count} ${count === 1 ? 'directo' : 'directos'} en 28 días`,
    liveNow: 'En directo ahora',
    nextPrefix: 'Próximo',
  },
  apiPromo: {
    heading: 'API para desarrolladores',
    comingSoon: 'Muy pronto',
    eyebrow: 'Para desarrolladores',
    headlineLead: 'Construye con los mismos datos:',
    headlineKey: 'muy pronto, en nuestra API.',
    body: 'Estamos incorporando a los primeros socios piloto. Únete a la lista de espera y te escribiremos en cuanto se abra el acceso público — con un nivel gratuito para desarrolladores indie incluido.',
    bullets: [
      'Estado en directo y espectadores en tiempo real',
      'Próximos streams predichos por IA con nivel de confianza',
      'Webhooks para eventos de «se ha puesto en directo»',
      'Especificación OpenAPI incluida',
    ],
    cta: 'Únete a la lista de espera',
  },
  live: {
    h1: 'En directo ahora en Twitch y YouTube',
    intro: (liveCount, categoryCount, soonCount, soonHours = 6) =>
      `${liveCount} streamer${liveCount === 1 ? ' está' : 's están'} en directo ahora mismo` +
      (categoryCount > 0
        ? ` en ${categoryCount} juego${categoryCount === 1 ? '' : 's'} y categorías`
        : '') +
      '.' +
      (soonCount > 0
        ? ` ${soonCount} más ${soonCount === 1 ? 'tiene previsto empezar' : 'tienen previsto empezar'} en las próximas ${soonHours} horas.`
        : ''),
    introEmpty: 'Ahora mismo no hay nadie en directo — esto es lo que empieza pronto.',
    error: 'El estado en directo no está disponible temporalmente. Inténtalo de nuevo en un momento.',
    otherCategory: 'Otros',
    categoryLiveAria: (name) => `${name} — en directo ahora`,
    nLive: (n) => `${n} en directo`,
    jumpToGame: 'Ir a un juego',
    startingSoon: 'Empiezan pronto',
    nextNHours: (n) => `próximas ${n} horas`,
    emptyAll:
      'Ahora mismo no hay nada en directo ni a punto de empezar. Explora el directorio completo de streamers o descubre juegos para encontrar tu próximo stream.',
    itemListName: 'Streamers en directo ahora mismo en Twitch y YouTube',
  },
  streamers: {
    h1: 'Todos los streamers de Twitch y YouTube de la A a la Z',
    intro:
      'Todos los streamers que seguimos en Streamer Times — mira quién está en directo y qué van a emitir después. Recorre la lista completa página a página.',
    pageOf: (page, totalPages) => `Página ${page} de ${totalPages}.`,
    error: 'Los streamers no están disponibles temporalmente. Inténtalo de nuevo en un momento.',
    paginationAria: 'Paginación',
    prev: '← Anterior',
    next: 'Siguiente →',
  },
  games: {
    liveRightNow: 'En directo ahora',
    liveAria: 'Juegos con streams en directo',
    error: 'Los juegos no están disponibles temporalmente. Inténtalo de nuevo en un momento.',
    aboutHeading: 'Sobre estos juegos',
    updatedAt: (stamp) => `Actualizado a las ${stamp}.`,
    relatedAria: 'Páginas relacionadas',
  },
  gamesRoot: {
    h1: 'Los juegos más populares de Twitch y YouTube',
    methodologyNote:
      'Ordenados por cuántos streamers seguimos en cada categoría durante los últimos 28 días.',
    intro: (gameCount, liveStreamerCount, liveGameCount) => {
      const lead = `Seguimos ${gameCount} juego${gameCount === 1 ? '' : 's'} y categorías en Twitch y YouTube.`;
      const note =
        'Ordenados por cuántos streamers seguimos en cada categoría durante los últimos 28 días.';
      if (liveStreamerCount <= 0) return `${lead} ${note}`;
      const streamers = `${formatCompactNumber(liveStreamerCount, 'es')} streamer${liveStreamerCount === 1 ? ' está' : 's están'} en directo ahora mismo`;
      const across =
        liveGameCount > 0
          ? ` en ${liveGameCount} categoría${liveGameCount === 1 ? '' : 's'}`
          : '';
      return `${lead} ${streamers}${across}. ${note}`;
    },
    faqPopularQ: '¿Cuál es el juego más popular de Twitch y YouTube?',
    faqPopularA: (top, second) =>
      `${top.category} es el que más streamers reúne entre los que seguimos — ${top.count} canal${top.count === 1 ? ' lo emitió' : 'es lo emitieron'} en los últimos 28 días${second ? `, por delante de ${second.category} con ${second.count}` : ''}.`,
    faqWhoQ: '¿Quién está haciendo streaming ahora mismo?',
    faqWhoA: (liveStreamerCount, liveGameCount) =>
      `${liveStreamerCount} streamer${liveStreamerCount === 1 ? ' está' : 's están'} en directo en ${liveGameCount} categoría${liveGameCount === 1 ? '' : 's'}. Abre cualquier categoría para ver los canales en directo y sus próximos streams.`,
    faqRankedQ: '¿Cómo se clasifican estos juegos?',
    faqRankedA: (gameCount) =>
      `Ordenados por cuántos streamers seguimos en cada categoría durante los últimos 28 días. Las cifras salen de un agregado nocturno de emisiones terminadas sobre ${gameCount} juego${gameCount === 1 ? '' : 's'}; los datos en directo se actualizan cada pocos minutos.`,
    faqHoursQ: '¿«Horas emitidas» significa tiempo de visionado?',
    faqHoursA:
      'No. Las horas emitidas miden cuánto tiempo estuvieron en directo los streamers en una categoría. No registramos el tiempo de visionado de los espectadores; los espectadores en directo de las tarjetas son una muestra puntual, no un total.',
  },
  rankings: {
    h1: 'Rankings de streamers',
    intro: (n) =>
      `¿Quiénes son los streamers más grandes, los que más crecen, los más activos y los más constantes de Twitch y YouTube? ${n} clasificaciones sobre todos los streamers que seguimos — actualizadas a diario con datos reales de emisiones.`,
    dataRefreshed: (label) => ` Datos actualizados el ${label}.`,
    statStreamersTracked: 'streamers seguidos',
    statLiveNow: 'en directo ahora',
    statGamesCategories: 'juegos y categorías',
    seeFullRanking: 'Ver el ranking completo →',
    warmingUp: 'Las clasificaciones se están calentando — vuelve pronto.',
    byGameHeading: 'Rankings por juego',
    byGameSubtitle: 'Los streamers con más seguidores de cada juego y categoría.',
    byGameAria: 'Rankings de juegos populares',
    topGameStreamers: (category) => `Mejores streamers de ${category}`,
    whoIsLive: '¿Quién está en directo ahora mismo?',
    climbersThisWeek: 'Los que más suben esta semana',
    metricH1: {
      'most-followed': 'Streamers con más seguidores',
      'fastest-growing': 'Streamers que más crecen',
      'most-watched': 'Streamers más vistos',
      'most-active': 'Streamers más activos',
      'most-reliable': 'Streamers más puntuales',
    },
    metricNote: {
      'most-followed':
        'Actualizado a diario. Los recuentos de seguidores y suscriptores se refrescan con regularidad y pueden ir por detrás de las cifras en vivo de las plataformas.',
      'fastest-growing':
        'Ganancia de seguidores del canal (Twitch) o suscriptores (YouTube) en los últimos 7 días, a partir de instantáneas diarias de cada canal seguido. Solo clasifican los canales con crecimiento positivo. Actualizado a diario.',
      'most-watched':
        'Mediana de espectadores simultáneos en directo durante los últimos 28 días (muestreo cada hora). Actualizado a diario.',
      'most-active':
        'Horas totales en directo en los últimos 28 días. Cada stream se cuenta una vez; los canales 24/7 siempre en emisión quedan excluidos. Actualizado a diario.',
      'most-reliable':
        'Porcentaje de streams anunciados en Twitch que realmente empezaron dentro de ±30 minutos, sobre los últimos 20 streams anunciados en 90 días (mínimo 10 evaluados). Actualizado a diario.',
    },
  },
  gameChips: {
    aria: (category) => `Estadísticas de ${category}`,
    streamersLabel: (n) => (n === 1 ? 'streamer' : 'streamers'),
    liveNowLabel: 'en directo ahora',
    watchingLabel: 'viendo',
    streamedLabel: 'de stream · 28 días',
    streamsLabel: () => 'streams · 28 días',
    peakLead: 'Pico de ',
    peakTail: ' espectadores · 28 días',
    trendTail: ' esta semana',
    trendTitle: 'Cambio de streamers activos respecto a la semana pasada',
  },
  game: {
    notFoundTitle: 'Juego no encontrado — StreamerTimes',
    metaTitle: (category) => `Streamers de ${category} — En directo, rankings y horarios`,
    metaDescription: (category, names) => {
      const tail = `Quién está en directo ahora, próximos streams y horarios predichos por IA en Twitch y YouTube.`;
      const namesLead =
        names.length > 0
          ? `${listConjunction(names, 'es')} ${names.length === 1 ? 'lidera' : 'lideran'} el ranking de ${category}. `
          : '';
      const twoNamesLead =
        names.length > 1
          ? `${listConjunction(names.slice(0, 2), 'es')} lideran el ranking de ${category}. `
          : '';
      return [
        `${namesLead}${tail}`,
        `${twoNamesLead}${tail}`,
        `Los streamers de ${category} con más seguidores. ${tail}`,
        tail,
      ];
    },
    ogTitle: (category) => `Streamers de ${category} — en directo, rankings y horarios`,
    ogDescription: (category, names) => {
      const ogNames = names.length > 0 ? ` — ${listConjunction(names, 'es')} —` : ':';
      return `Los streamers de ${category} con más seguidores${ogNames} estado en directo y horarios de stream en Twitch y YouTube.`;
    },
    h1: (category) => `Streamers de ${category} — en directo y horarios`,
    intro: (shown, category, liveCount, upcomingCount, superlative) =>
      `${shown} streamer${shown === 1 ? ' tiene' : 's tienen'} streams de ${category} en directo o programados esta semana en Twitch y YouTube. ` +
      (liveCount > 0
        ? `${liveCount} ${liveCount === 1 ? 'está' : 'están'} en directo ahora mismo`
        : 'Ninguno está en directo ahora mismo') +
      (upcomingCount > 0
        ? `, con ${upcomingCount} ${upcomingCount === 1 ? 'stream próximo' : 'streams próximos'} en los próximos 7 días.`
        : '.') +
      superlative,
    superlative: (category, name, value, isTwitch) =>
      ` El streamer de ${category} con más ${isTwitch ? 'seguidores' : 'suscriptores'} aquí es ${name}, con ${value}.`,
    onPageAria: 'En esta página',
    navLiveNow: 'En directo',
    navTopStreamers: 'Top streamers',
    navBestTimes: 'Mejores horas',
    navSchedule: 'Horario',
    navRelated: 'Juegos relacionados',
    followGame: (category) => `Seguir ${category}`,
    followingLabel: 'Siguiendo',
    watchingNow: (category) => `Viendo ${category} ahora`,
    liveStreamsAria: (category) => `Streams de ${category} en directo`,
    moreLiveAria: (category) => `Más streams de ${category} en directo`,
    showMoreLive: (n) =>
      n === 1 ? 'Ver 1 canal más en directo' : `Ver ${n} canales más en directo`,
    moreLiveInRanking: (n, category) =>
      `${n} más en directo en el ranking completo de ${category} →`,
    liveUpdatesNote:
      'El estado en directo y los espectadores se actualizan cada pocos minutos.',
    mostFollowed: (category) => `Streamers de ${category} con más seguidores`,
    tableCaption: (category) =>
      `Streamers de ${category} ordenados por seguidores, con su próximo stream esperado`,
    thRank: '#',
    thStreamer: 'Streamer',
    thNextStream: 'Próximo stream',
    thFollowers: 'Seguidores',
    thHours: 'Horas / 28 días',
    liveNowCell: 'En directo',
    seeFullRanking: (category) => `Ver el ranking completo de ${category} (top 50) →`,
    whoStreams: (category) => `Streamers que streamean ${category}`,
    whenStreamed: (category) => `¿Cuándo se streamea ${category}?`,
    heatmapSummary: (category) =>
      `La mayoría de los streams de ${category} van {peak}{tz} — según las últimas 4 semanas de streams registrados.`,
    heatmapSummaryEmpty: 'Según las últimas 4 semanas de streams registrados.',
    tzLocalSuffix: ' (tu hora)',
    tzUtcSuffix: ' (UTC)',
    heatmapAria: (category) => `Mapa de calor semanal de streams de ${category}.`,
    heatmapAriaWithPeak: (category) =>
      `Mapa de calor semanal de streams de ${category}. Franja más activa: {peak}.`,
    heatmapTooltip: '{day} {from}–{to} · {amount} de stream en 4 semanas',
    legendLess: 'Menos',
    legendMore: 'Más',
    heatmapDayNames: [
      'los lunes',
      'los martes',
      'los miércoles',
      'los jueves',
      'los viernes',
      'los sábados',
      'los domingos',
    ],
    bestTimeToStream: (category) => `Mejor hora para streamear ${category}`,
    trendingBadge: '▲ En tendencia',
    bestTimeIntro: (category) =>
      `Para streamers: las franjas en las que ${category} tiene más espectadores por canal en directo.`,
    fullHeatmapLink: 'Mapa de calor de oportunidades y análisis completo →',
    bestSlotsAria: 'Mejores franjas horarias',
    viewersPerChannel: '~{score} espectadores/canal',
    timesLocalNote: 'Horas en tu zona horaria.',
    timesUtcNote: 'Horas en UTC.',
    quietTitle: (category) => `Ahora mismo no hay streams de ${category}`,
    quietBody: (category) =>
      `Ninguno de los streamers de ${category} que seguimos está en directo ni se espera en los próximos 7 días. Los horarios y las predicciones de IA se actualizan varias veces al día — vuelve pronto.`,
    quietMeanwhile: 'Mientras tanto',
    seeWhosLive: 'Mira quién está en directo ahora →',
    browseAllGames: 'Explorar todos los juegos',
    gameStreamersChip: (category) => `Streamers de ${category}`,
    scheduleAria: (category) => `Horario de streams de ${category}`,
    upcomingStreams: (category) => `Próximos streams de ${category}`,
    scheduleNote:
      'Las horas se ajustan a tu zona horaria, con la hora del streamer al lado. Los días siguen el calendario UTC, así que un stream nocturno puede aparecer bajo el día siguiente.',
    filterAria: 'Filtrar el horario',
    allPlatforms: 'Todas las plataformas',
    hideLowConfidence: 'Ocultar probabilidad baja',
    moreLowConfidence: (n) =>
      n === 1
        ? '1 predicción más con probabilidad baja'
        : `${n} predicciones más con probabilidad baja`,
    lowConfAria: (label) => `Predicciones con probabilidad baja: ${label}`,
    hiddenNotShown: (n) =>
      n === 1
        ? '1 predicción más de este día no se muestra. Abre la página del streamer para ver su horario completo.'
        : `${n} predicciones más de este día no se muestran. Abre la página del streamer para ver su horario completo.`,
    relatedGames: 'Juegos relacionados',
    relatedGamesAria: 'Juegos relacionados',
    relatedNote:
      'Juegos cuyos streamers coinciden en los últimos 28 días.',
    allGamesFooter: '← Todos los juegos y categorías',
  },
  gameRanking: {
    notFoundTitle: 'No encontrado — StreamerTimes',
    metaTitle: (category, page) =>
      page === 1
        ? `Top streamers de ${category} — por seguidores`
        : `Top streamers de ${category} — por seguidores — Página ${page}`,
    metaLeadIn: (name, value) => `${name} lidera con ${value} seguidores. `,
    metaDescription: (category, leadIn) => [
      `${leadIn}Los mejores streamers de ${category} en Twitch y YouTube, ordenados por seguidores, con estado en directo y próximos streams. Actualizado a diario.`,
      `${leadIn}Los mejores streamers de ${category} por seguidores, con estado en directo y próximos streams.`,
      `Los mejores streamers de ${category} en Twitch y YouTube, ordenados por seguidores, con estado en directo y próximos streams. Actualizado a diario.`,
    ],
    ogTitle: (category) => `Top streamers de ${category} — por seguidores`,
    h1: (category) => `Top streamers de ${category} por seguidores`,
    introPage1: (count, category) =>
      `Los ${count} mejores streamers de ${category} que seguimos, ordenados por seguidores y suscriptores del canal.`,
    topsTheList: (name, value, isTwitch) =>
      ` ${name} encabeza la lista con ${value} ${isTwitch ? 'seguidores' : 'suscriptores'}.`,
    introPageN: (from, to, total, category) =>
      `Puestos ${from}–${to} de ${total} streamers de ${category} que seguimos, ordenados por seguidores y suscriptores del canal.`,
    methodology: (category) =>
      `Streamers activos en ${category} en los últimos 28 días, ordenados por seguidores. Las cifras se actualizan con regularidad y pueden ir por detrás de las de las plataformas.`,
    followersRefreshed: (label) => ` Seguidores actualizados: ${label}.`,
    warmingUp:
      'Este ranking está calentando motores — necesitamos algo más de datos para que sea fiable. Vuelve pronto.',
    missingDataNote:
      '— significa que aún no hemos reunido datos suficientes de ese canal, por ejemplo muestreos de espectadores en canales recién añadidos.',
    sortAria: 'Ordenar el ranking',
    sortFollowers: 'Más seguidos',
    sortHours: 'Más horas (28 días)',
    sortViewers: 'Más vistos',
    filterLangAria: 'Filtrar por idioma',
    allChip: 'Todos',
    noMatch: 'Ningún streamer coincide con este filtro.',
    tableCaption: (category) => `Streamers de ${category} ordenados por seguidores`,
    thRank: '#',
    thStreamer: 'Streamer',
    thFollowers: 'Seguidores',
    thAvgViewers: 'Espectadores medios',
    thHours: 'Horas (28 días)',
    thShare: 'Cuota del juego',
    thShareTitle: (category) =>
      `Parte de los últimos streams del streamer que fueron de ${category}`,
    thNextStream: 'Próximo stream',
    liveNowCell: 'En directo',
    watchingTail: ' · {value} viendo',
    trendNewBadge: 'nuevo',
    trendNewTitle: 'Hace una semana no estaba en este ranking',
    trendUpTemplate: 'Sube {n} desde la semana pasada',
    trendDownTemplate: 'Baja {n} desde la semana pasada',
    mainGameTemplate: 'Juego principal: {share}% de sus últimos streams',
    aboutRanking: 'Sobre este ranking',
    faqMostFollowedQ: (category) =>
      `¿Qué streamer de ${category} tiene más seguidores?`,
    faqMostFollowedA: (category, top, second) => {
      const runnerUp = second ? `, por delante de ${second.name} con ${second.value}` : '';
      return `${top.name} es ahora mismo el streamer de ${category} con más ${top.isTwitch ? 'seguidores' : 'suscriptores'} de los que seguimos, con ${top.value}${runnerUp}. Las cifras se actualizan a diario.`;
    },
    faqHowManyQ: (category) => `¿Cuántos streamers streamean ${category}?`,
    faqHowManyA: (category, count, activity) => {
      const tail = activity
        ? ` Entre todos streamearon unas ${activity.hours} horas de ${category} en ${activity.streams} streams en los últimos 28 días.`
        : '';
      return `Actualmente seguimos a ${count} streamer${count === 1 ? '' : 's'} que streamearon ${category} hace poco o lo tienen en su horario.${tail}`;
    },
    faqMeasuredQ: '¿Cómo se mide este ranking?',
    faqMeasuredA: (category) =>
      `Streamers activos en ${category} en los últimos 28 días, ordenados por los seguidores de su canal principal — seguidores del canal en Twitch o suscriptores en YouTube. Las columnas de horas y cuota salen de un agregado nocturno de streams de ${category} finalizados.`,
    faqShareQ: '¿Qué significa «Cuota del juego»?',
    faqShareA: (category) =>
      `La parte de los últimos streams de un streamer que fueron de ${category}. 100 % significa que ahora mismo es su único juego; una cuota baja marca a un visitante ocasional de la categoría.`,
    relatedRankings: 'Rankings relacionados',
    relatedRankingsAria: 'Rankings de juegos relacionados',
    liveAndSchedule: (category) => `En directo y horario de ${category} →`,
    allRankings: 'Todos los rankings',
    paginationAria: (category) => `Páginas del ranking de ${category}`,
    prev: '← Anterior',
    next: 'Siguiente →',
  },
};
