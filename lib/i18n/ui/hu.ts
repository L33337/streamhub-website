import type { UiLex } from '../types';

// Hungarian — informal te-form (streaming register); "stream/streamel" as used
// by the Hungarian streaming community.
export const hu: UiLex = {
  breadcrumb: {
    home: 'Kezdőlap',
    streamers: 'Streamerek',
  },
  hero: {
    featured: 'Kiemelt',
    nowStreaming: 'Épp streamel:',
    avatarAlt: (name) => `${name} avatárja`,
  },
  promo: {
    valueProps: [
      'Mentsd el a kedvenc streamereidet',
      'Kapj értesítést, amint élőbe mennek',
      'Adj hozzá bármilyen új streamert pár másodperc alatt',
    ],
    qrAria: 'QR-kód — olvasd be a telefonoddal a Streamer Times apphoz',
    getApp: 'Töltsd le az appot',
  },
  lastStream: {
    heading: 'Legutóbbi stream',
    pastStream: 'Korábbi stream',
    watchVod: 'VOD megtekintése →',
    watchAria: (name, title) => `${name} legutóbbi streamjének megtekintése: ${title}`,
  },
  recent: {
    heading: 'Legutóbbi streamek',
    vodAria: (title) => `VOD megtekintése: ${title}`,
  },
  channelStats: {
    heading: 'Csatorna-statisztikák',
    followers: 'Követők',
    subscribers: 'Feliratkozók',
    avgViewers: 'Átlagos nézők',
    medianDetail: '28 napos medián',
    peakViewers: 'Nézőcsúcs',
    hoursStreamed: 'Streamelt órák',
    lastNDays: (n) => `az elmúlt ${n} napban`,
  },
  stats: {
    heading: (name) => `Mikor streamel ${name}?`,
    caption: (name, tz) =>
      `${name} tipikus streamidőpontjai a hét napjai szerint, ${tz} szerint megjelenítve`,
    colDay: 'Nap',
    colTime: 'Tipikus időpont',
    colDuration: 'Hossz',
    usuallyNoStream: 'Általában nincs stream',
    streamsPerWeek: 'Stream hetente',
    typicalLength: 'Tipikus streamhossz',
    topCategories: 'Legtöbbet streamelt kategóriák',
    basedOn: (n, d) => `${n} stream alapján az elmúlt ${d} napból.`,
    allTimesIn: (tz) => `Minden időpont ${tz} szerint jelenik meg`,
    cityTime: (city) => `${city} idő`,
    leadSentence: (name, days, times) => {
      const base = `${name} általában heti ${days} napon streamel`;
      return times
        ? `${base}, jellemzően ${times.start} és ${times.end} között (${times.tzLabel}).`
        : `${base}.`;
    },
  },
  faq: {
    heading: 'Gyakori kérdések',
    qIsLive: (name) => `${name} élőben van most?`,
    aIsLiveCat: (name, cat, platforms) =>
      `Igen — ${name} épp élőben streameli a(z) ${cat} kategóriát itt: ${platforms}.`,
    aIsLive: (name, platforms) => `Igen — ${name} épp élőben van itt: ${platforms}.`,
    qUsually: (name) => `Mikor szokott streamelni ${name}?`,
    typicallyLast: (duration) => `A streamek általában kb. ${duration} hosszúak.`,
    qSchedule: (name) => `Milyen ${name} streambeosztása?`,
    aScheduleLead: (name, n) =>
      `${name} beosztásában ${n} stream szerepel a következő 7 napra.`,
    nextUp: (entry) => `A következő: ${entry}.`,
    afterThat: (list) => `Utána: ${list}.`,
    plusMore: (n) => `Plusz még ${n} — lásd a teljes beosztást fent.`,
    allTimesNote: (tz) => `Minden időpont ${tz} szerint értendő.`,
    predictedNote:
      'Az előrejelzésként jelölt időpontokat MI becsüli a korábbi streammintázatok alapján.',
    outsideDates: (name, time, tz) =>
      `Ezeken a napokon kívül ${name} jellemzően ${time} körül megy élőbe (${tz}) — lásd a tipikus streamidőpontokat fent.`,
    predictedMarker: 'előrejelzés',
    qGames: (name) => `Milyen játékokkal streamel ${name}?`,
    aGamesOne: (name, cat) =>
      `${name} jelenleg ezt streameli: ${cat}. A közelgő streameket a fenti beosztásban találod.`,
    aGamesMany: (name, list) =>
      `${name} ezekkel streamel: ${list}. A fenti beosztásban látod, mi jön.`,
    qHowOften: (name) => `Milyen gyakran streamel ${name}?`,
    aAlwaysOn: (name, platforms) =>
      `${name} 24/7 streamel — a csatorna folyamatosan élőben van itt: ${platforms}.`,
    aPerWeek: (name, perWeek, windowDays) =>
      `${name} átlagosan kb. heti ${perWeek} alkalommal streamel az elmúlt ${windowDays} nap adásai alapján.`,
    aScheduleCount: (name, n, daysList) => {
      const base = `${name} beosztásában ${n} stream szerepel a következő 7 napra`;
      return daysList ? `${base}, ezeken a napokon: ${daysList}.` : `${base}.`;
    },
    qWhere: (name) => `Hol nézhetem ${name} streamjeit?`,
    aWhere: (name, platforms) =>
      `${name} élőben streamel itt: ${platforms}. Add hozzá ${name} csatornáját a Streamer Timeson, és egy helyen követheted az élő státuszt és a közelgő streameket.`,
    qTimezone: (name) => `Milyen időzónában streamel ${name}?`,
    aTimezone: (name, tzCity) =>
      `${name} a(z) ${tzCity} időzónában él. Az oldal beosztása minden streamet a te helyi idődben és ${name} helyi idejében is mutat.`,
    qPredicted: (name) => `${name} streamidőpontjai előrejelzések vagy megerősítettek?`,
    aAllPredicted: (name) =>
      `${name} közelgő streamidőpontjai MI-előrejelzések a korábbi streammintázatok alapján, magas, közepes vagy alacsony valószínűséggel jelölve. A megerősített időpontok itt jelennek meg, amint bejelentik őket.`,
    aMixed: (name, predicted, total) =>
      `${name} beosztása MI-előrejelzéseket és megerősített streameket vegyít. A ${total} közelgő időpontból ${predicted} a korábbi mintázatokból előrejelzett, valószínűségi szinttel jelölve.`,
  },
  empty: {
    heading: 'Nincs betervezett stream',
    body: (name, platforms) =>
      `${name} élő adásait itt követjük: ${platforms}. Az MI-előrejelzések és a megerősített időpontok akkor jelennek meg itt, ha összegyűlt elég előzmény.`,
    browseAll: 'Böngéssz az összes streamer között',
  },
  related: {
    heading: 'Hasonló streamerek',
    liveNowSr: '(épp élőben)',
  },
  games: {
    heading: 'Játékok',
    navAria: 'Játékok, amikkel ez a streamer játszik',
  },
};
