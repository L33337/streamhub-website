import type { UiLex } from '../types';

// Italian — tu-form; "stream"/"live" are invariable loanwords (1 stream,
// 3 stream) as used by the Italian streaming community.
export const it: UiLex = {
  breadcrumb: {
    home: 'Home',
    streamers: 'Streamer',
  },
  hero: {
    featured: 'In evidenza',
    nowStreaming: 'In diretta ora:',
    avatarAlt: (name) => `Avatar di ${name}`,
  },
  promo: {
    valueProps: [
      'Salva i tuoi streamer preferiti',
      'Ricevi una notifica appena vanno in live',
      'Aggiungi qualsiasi streamer in pochi secondi',
    ],
    qrAria: 'Codice QR — scansionalo con il telefono per scaricare l’app Streamer Times',
    getApp: 'Scarica l’app',
  },
  lastStream: {
    heading: 'Ultimo stream',
    pastStream: 'Stream passato',
    watchVod: 'Guarda il VOD →',
    watchAria: (name, title) => `Guarda l’ultimo stream di ${name}: ${title}`,
  },
  recent: {
    heading: 'Stream recenti',
    vodAria: (title) => `Guarda il VOD: ${title}`,
  },
  channelStats: {
    heading: 'Statistiche del canale',
    followers: 'Follower',
    subscribers: 'Iscritti',
    avgViewers: 'Spettatori medi',
    medianDetail: 'mediana su 28 giorni',
    peakViewers: 'Picco di spettatori',
    hoursStreamed: 'Ore in diretta',
    lastNDays: (n) => `ultimi ${n} giorni`,
  },
  stats: {
    heading: (name) => `Quando streamma ${name}?`,
    // `tz` is the cityTime label ("ora di Berlin") — parenthetical/colon
    // constructions read better than "mostrati in ora di …".
    caption: (name, tz) =>
      `Orari di stream tipici di ${name} per giorno della settimana (${tz})`,
    colDay: 'Giorno',
    colTime: 'Orario tipico',
    colDuration: 'Durata',
    usuallyNoStream: 'Di solito nessuno stream',
    streamsPerWeek: 'Stream a settimana',
    typicalLength: 'Durata tipica dello stream',
    topCategories: 'Categorie più streammate',
    basedOn: (n, d) => `In base a ${n} stream degli ultimi ${d} giorni.`,
    allTimesIn: (tz) => `Fuso orario degli orari mostrati: ${tz}`,
    cityTime: (city) => `ora di ${city}`,
    leadSentence: (name, days, times) => {
      const dayWord = days === 1 ? 'giorno' : 'giorni';
      const base = `${name} di solito streamma ${days} ${dayWord} a settimana`;
      return times
        ? `${base}, in genere tra le ${times.start} e le ${times.end} (${times.tzLabel}).`
        : `${base}.`;
    },
  },
  faq: {
    heading: 'Domande frequenti',
    qIsLive: (name) => `${name} è in live adesso?`,
    aIsLiveCat: (name, cat, platforms) =>
      `Sì — ${name} è in live adesso e streamma ${cat} su ${platforms}.`,
    aIsLive: (name, platforms) => `Sì — ${name} è in live adesso su ${platforms}.`,
    qUsually: (name) => `Quando streamma di solito ${name}?`,
    typicallyLast: (duration) => `Gli stream durano in genere circa ${duration}.`,
    qSchedule: (name) => `Qual è il programma degli stream di ${name}?`,
    aScheduleLead: (name, n) =>
      n === 1
        ? `${name} ha 1 stream in programma nei prossimi 7 giorni.`
        : `${name} ha ${n} stream in programma nei prossimi 7 giorni.`,
    nextUp: (entry) => `Il prossimo: ${entry}.`,
    afterThat: (list) => `Poi: ${list}.`,
    plusMore: (n) =>
      n === 1
        ? `Più 1 altro — vedi il programma completo qui sopra.`
        : `Più altri ${n} — vedi il programma completo qui sopra.`,
    predictedNote:
      'Gli orari contrassegnati come previsioni sono stimati dall’IA in base ai pattern degli stream passati.',
    outsideDates: (name, time, tz) =>
      `Al di fuori di queste date, ${name} in genere va in live verso le ${time} (${tz}) — vedi gli orari tipici qui sopra.`,
    predictedMarker: 'previsione',
    qGames: (name) => `A quali giochi streamma ${name}?`,
    aGamesOne: (name, cat) =>
      `${name} sta streammando ${cat} al momento. Guarda il programma qui sopra per i prossimi stream.`,
    aGamesMany: (name, list) =>
      `${name} streamma ${list}. Guarda il programma qui sopra per vedere cosa arriva.`,
    qHowOften: (name) => `Ogni quanto streamma ${name}?`,
    aAlwaysOn: (name, platforms) =>
      `${name} streamma 24/7 — il canale è sempre in live su ${platforms}.`,
    aPerWeek: (name, perWeek, windowDays) =>
      `${name} streamma in media circa ${perWeek} volte a settimana, in base alle trasmissioni degli ultimi ${windowDays} giorni.`,
    aScheduleCount: (name, n, daysList) => {
      const base =
        n === 1
          ? `${name} ha 1 stream in programma nei prossimi 7 giorni`
          : `${name} ha ${n} stream in programma nei prossimi 7 giorni`;
      return daysList ? `${base}, di ${daysList}.` : `${base}.`;
    },
    qWhere: (name) => `Dove posso guardare ${name}?`,
    aWhere: (name, platforms) =>
      `${name} streamma in diretta su ${platforms}. Aggiungi ${name} su Streamer Times per seguire lo stato live e i prossimi stream in un unico posto.`,
    qTimezone: (name) => `In quale fuso orario streamma ${name}?`,
    aTimezone: (name, tzCity) =>
      `${name} vive nel fuso orario di ${tzCity}. Il programma di questa pagina mostra ogni stream nella tua ora locale e nell’ora locale di ${name}.`,
    qPredicted: (name) => `Gli orari di ${name} sono previsti o confermati?`,
    aAllPredicted: (name) =>
      `I prossimi orari di ${name} sono previsioni dell’IA basate sui pattern degli stream passati, ognuna con un livello di probabilità alto, medio o basso. Gli orari confermati compaiono qui appena vengono annunciati.`,
    aMixed: (name, predicted, total) =>
      `Il programma di ${name} unisce previsioni dell’IA e stream confermati. ${predicted} dei ${total} prossimi orari sono previsti in base ai pattern passati, mostrati con il livello di probabilità.`,
  },
  empty: {
    heading: 'Nessuno stream in programma',
    body: (name, platforms) =>
      `Seguiamo le live di ${name} su ${platforms}. Le previsioni dell’IA e i programmi confermati compariranno qui quando ci sarà abbastanza cronologia.`,
    browseAll: 'Sfoglia tutti gli streamer',
  },
  related: {
    heading: 'Streamer simili',
    liveNowSr: '(in live ora)',
  },
  games: {
    heading: 'Giochi',
    navAria: 'Giochi a cui gioca questo streamer',
  },
};
