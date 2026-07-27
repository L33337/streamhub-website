import type { UiLex } from '../types';

// Spanish — informal tú-form, neutral Latin/European wording where possible;
// "stream/streamear" loanwords match the streaming community's usage.
export const es: UiLex = {
  breadcrumb: {
    home: 'Inicio',
    streamers: 'Streamers',
  },
  hero: {
    featured: 'Destacado',
    nowStreaming: 'Transmitiendo ahora:',
    avatarAlt: (name) => `Avatar de ${name}`,
    showMore: 'Ver más',
    showLess: 'Ver menos',
  },
  promo: {
    valueProps: [
      'Guarda a tus streamers favoritos',
      'Recibe una notificación en cuanto estén en directo',
      'Añade cualquier streamer nuevo en segundos',
    ],
    qrAria: 'Código QR — escanéalo con tu móvil para descargar la app de Streamer Times',
    getApp: 'Descarga la app',
  },
  lastStream: {
    heading: 'Último stream',
    pastStream: 'Stream anterior',
    watchVod: 'Ver VOD →',
    watchAria: (name, title) => `Ver el último stream de ${name}: ${title}`,
  },
  recent: {
    heading: 'Streams recientes',
    vodAria: (title) => `Ver VOD: ${title}`,
  },
  channelStats: {
    heading: 'Estadísticas del canal',
    followers: 'Seguidores',
    subscribers: 'Suscriptores',
    avgViewers: 'Media de espectadores',
    medianDetail: 'mediana de 28 días',
    peakViewers: 'Pico de espectadores',
    hoursStreamed: 'Horas emitidas',
    lastNDays: (n) => `últimos ${n} días`,
  },
  streamerRankings: {
    heading: 'Clasificaciones',
    intro: (name) => `Dónde se sitúa ${name} en nuestras clasificaciones de streamers.`,
    ofTotal: (total) => `de ${total}`,
    metric: {
      'most-followed': 'Más seguidos',
      'most-watched': 'Más vistos',
      'most-active': 'Más activos',
      'most-reliable': 'Más puntuales',
      'fastest-growing': 'Crecimiento más rápido',
    },
    rowAria: (rank, total, label) => `Puesto ${rank} de ${total} en ${label}`,
    trendUp: (p) => `sube ${p} ${p === 1 ? 'puesto' : 'puestos'} desde la semana pasada`,
    trendDown: (p) => `baja ${p} ${p === 1 ? 'puesto' : 'puestos'} desde la semana pasada`,
    byCategory: 'Por categoría',
    summary: (name, parts) => `${name} está en ${parts.join(' y ')} en Streamer Times.`,
  },
  stats: {
    heading: (name) => `¿Cuándo transmite ${name}?`,
    caption: (name, tz) =>
      `Horarios típicos de stream de ${name} por día de la semana, mostrados en ${tz}`,
    colDay: 'Día',
    colTime: 'Hora habitual',
    colDuration: 'Duración',
    usuallyNoStream: 'Normalmente sin stream',
    streamsPerWeek: 'Streams por semana',
    typicalLength: 'Duración típica del stream',
    topCategories: 'Categorías más emitidas',
    basedOn: (n, d) => `Basado en ${n} streams de los últimos ${d} días.`,
    allTimesIn: (tz) => `Todas las horas se muestran en ${tz}`,
    cityTime: (city) => `hora de ${city}`,
    tzToggleYour: 'Tu hora',
    tzToggleAria: 'Mostrar horas en',
    leadSentence: (name, days, times) => {
      const dayWord = days === 1 ? 'día' : 'días';
      const base = `${name} suele transmitir ${days} ${dayWord} por semana`;
      return times
        ? `${base}, normalmente entre las ${times.start} y las ${times.end} (${times.tzLabel}).`
        : `${base}.`;
    },
  },
  faq: {
    heading: 'Preguntas frecuentes',
    qIsLive: (name) => `¿Está ${name} en directo ahora mismo?`,
    aIsLiveCat: (name, cat, platforms) =>
      `Sí — ${name} está en directo ahora, transmitiendo ${cat} en ${platforms}.`,
    aIsLive: (name, platforms) => `Sí — ${name} está en directo ahora en ${platforms}.`,
    qUsually: (name) => `¿Cuándo suele transmitir ${name}?`,
    typicallyLast: (duration) => `Los streams suelen durar alrededor de ${duration}.`,
    qSchedule: (name) => `¿Cuál es el horario de streams de ${name}?`,
    aScheduleLead: (name, n) =>
      n === 1
        ? `${name} tiene 1 stream programado para los próximos 7 días.`
        : `${name} tiene ${n} streams programados para los próximos 7 días.`,
    nextUp: (entry) => `El próximo: ${entry}.`,
    afterThat: (list) => `Después: ${list}.`,
    plusMore: (n) =>
      n === 1
        ? `Y uno más — consulta el horario completo arriba.`
        : `Y ${n} más — consulta el horario completo arriba.`,
    allTimesNote: (tz) => `Todas las horas se muestran en ${tz}.`,
    predictedNote:
      'Las horas marcadas como predicción se estiman con IA a partir de patrones de streams anteriores.',
    outsideDates: (name, time, tz) =>
      `Fuera de esas fechas, ${name} suele empezar sobre las ${time} (${tz}) — consulta los horarios típicos arriba.`,
    predictedMarker: 'predicción',
    qGames: (name) => `¿A qué juegos juega ${name} en stream?`,
    aGamesOne: (name, cat) =>
      `${name} está transmitiendo ${cat} actualmente. Consulta el horario de arriba para ver los próximos streams.`,
    aGamesMany: (name, list) =>
      `${name} transmite ${list}. Consulta el horario de arriba para ver lo que viene.`,
    qHowOften: (name) => `¿Con qué frecuencia transmite ${name}?`,
    aAlwaysOn: (name, platforms) =>
      `${name} transmite 24/7 — el canal está siempre en directo en ${platforms}.`,
    aPerWeek: (name, perWeek, windowDays) =>
      perWeek === 1
        ? `${name} transmite de media una vez por semana, según las emisiones de los últimos ${windowDays} días.`
        : `${name} transmite de media unas ${perWeek.toLocaleString('es')} veces por semana, según las emisiones de los últimos ${windowDays} días.`,
    aScheduleCount: (name, n, daysList) => {
      const base =
        n === 1
          ? `${name} tiene 1 stream programado para los próximos 7 días`
          : `${name} tiene ${n} streams programados para los próximos 7 días`;
      return daysList ? `${base}: ${daysList}.` : `${base}.`;
    },
    qWhere: (name) => `¿Dónde puedo ver a ${name}?`,
    aWhere: (name, platforms) =>
      `${name} transmite en directo en ${platforms}. Añade a ${name} en Streamer Times para saber cuándo está en directo y ver sus próximos streams, todo en un solo lugar.`,
    qTimezone: (name) => `¿En qué zona horaria transmite ${name}?`,
    aTimezone: (name, tzCity) =>
      `${name} vive en la zona horaria de ${tzCity}. El horario de esta página muestra cada stream en tu hora local y en la hora local de ${name}.`,
    qPredicted: (name) => `¿Los horarios de ${name} son predicciones o están confirmados?`,
    aAllPredicted: (name) =>
      `Los próximos horarios de ${name} son predicciones de IA basadas en patrones de streams anteriores, cada una con un nivel de probabilidad alto, medio o bajo. Los horarios confirmados aparecerán aquí en cuanto se anuncien.`,
    aMixed: (name, predicted, total) =>
      predicted === 1
        ? `El horario de ${name} combina predicciones de IA con streams confirmados. 1 de los próximos ${total} horarios es una predicción basada en patrones anteriores, mostrada con su nivel de probabilidad.`
        : `El horario de ${name} combina predicciones de IA con streams confirmados. ${predicted} de los próximos ${total} horarios son predicciones basadas en patrones anteriores, mostradas con su nivel de probabilidad.`,
  },
  empty: {
    heading: 'No hay streams programados',
    body: (name, platforms) =>
      `Seguimos los directos de ${name} en ${platforms}. Las predicciones de IA y los horarios confirmados aparecerán aquí cuando haya suficiente historial.`,
    browseAll: 'Ver todos los streamers',
  },
  related: {
    heading: 'Streamers relacionados',
    liveNowSr: '(en directo ahora)',
  },
  games: {
    heading: 'Juegos',
    navAria: 'Juegos a los que juega este streamer',
  },
};
