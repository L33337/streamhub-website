import { formatCompactNumber } from '@/lib/format/number';
import type { HubLex } from './types';

export const hu: HubLex = {
  crumbs: {
    aria: 'Morzsamenü',
    home: 'Főoldal',
    liveNow: 'Most élőben',
    games: 'Játékok',
    streamers: 'Streamerek',
    rankings: 'Ranglisták',
    pageN: (n) => `${n}. oldal`,
  },
  common: {
    browseStreamersAZ: 'Összes streamer A–Z',
    allGamesCategories: 'Összes játék és kategória',
  },
  home: {
    browseAllGames: 'Böngészd az összes játékot és kategóriát →',
    seeLiveNow: 'Nézd meg, ki van most élőben →',
  },
  homeFeed: {
    ticker: (liveCount, soonCount, soonHours) => {
      const live = liveCount > 0 ? `${liveCount} streamer épp élőben` : '';
      const soon =
        soonCount > 0 ? `${soonCount} indul a következő ${soonHours} órában` : '';
      return live && soon ? `${live} · ${soon}` : live || soon;
    },
    liveTitle: 'Most a legnézettebbek',
    liveFilterCategory: 'Kategória',
    liveFilterLanguage: 'Nyelv',
    liveFilterAllCategories: 'Minden kategória',
    liveFilterAllLanguages: 'Minden nyelv',
    liveFilterOption: (label, count) => `${label} (${count})`,
    liveFilterMatches: (count) => `${count} élő adás`,
    liveFilterReset: 'Visszaállítás',
    liveFilterEmpty: 'Jelenleg egyetlen élő adás sem felel meg ezeknek a szűrőknek.',
    liveFilterNote: (count) => `Top ${count} a jelenlegi nézőszám alapján`,
    upNextTitle: 'A mai műsor',
    upNextLink: 'Élő és hamarosan induló →',
    chipAll: 'Mind',
    chipFavorites: 'Kedvenceim',
    lineupShowAll: (n) => `Mind a(z) ${n} stream megjelenítése`,
    lineupShowLess: 'Kevesebb',
    bellAria: (name) => `Értesítés, amikor ${name} élőben van`,
    upsell: {
      bellTitle: 'Ne maradj le egyetlen streamről se',
      bellBody:
        'Kapj push-értesítést közvetlenül a stream indulása előtt — az ingyenes Streamer Times appal.',
      favoritesTitle: 'Kedvenceid egyetlen érintésre',
      favoritesBody:
        'Kövesd a streamereket, és szűrd ezt az oldalt a saját műsorodra — ingyen, az appban vagy itt a böngészőben.',
      appCta: 'App letöltése',
      loginCta: 'Ingyenes belépés',
      close: 'Talán később',
    },
    interrupt: {
      title: 'Ez az oldal — csak a te streamereiddel.',
      body: 'Kövesd a streamereidet, és a műsorújságból személyes feeded lesz: a saját műsorod, push-értesítés közvetlenül az adás előtt és a hét legjobb pillanataik.',
      note: '30 másodperc az egész · ingyenes',
      appCta: 'App letöltése',
      loginCta: 'Belépés böngészőből',
    },
    clipsTitle: 'A hét klipjei',
    quickFactsTitle: 'Gyors tények',
    quickFactsSub: 'Az elmúlt 7 nap követett streamjeiből',
    factPredictionLabel: 'Előrejelzés-ellenőrzés',
    factPrediction: (hits, total) =>
      `${total} magas valószínűségű előrejelzésből ${hits} esetében a stream az előre jelzett időponthoz képest két órán belül elindult.`,
    factPeakLabel: 'A hét csúcsa',
    factPeak: (name) => `${name} érte el a hét legmagasabb egyidejű nézőszámát.`,
    factReliableLabel: 'Percre pontosan',
    factReliable: (name, hits, total) =>
      `${name} az utolsó ${total} bejelentett streamből ${hits} alkalommal indult időben.`,
    factPauseLabel: 'Szünetel',
    factPause: (name) => `${name} eddig a dátumig szünetet tart.`,
    risersTitle: 'A hét feltörekvői',
    risersLink: 'Minden ranglista →',
    risersGained: (delta) => `${delta} követő 7 nap alatt`,
    mostStreamedTitle: 'A hét legtöbbet streamelői',
    weekHours: (value) => `${value} óra élőben · 7 nap`,
    weekStreams: (n) => `${n} stream`,
    mostWatchedTitle: 'Legnézettebbek',
    topStreamersCol: 'Top 5 streamer',
    topCategoriesCol: 'Top 5 kategória',
    medianViewers: (value) => `${value} néző (medián)`,
    hoursStreamed: (value) => `${value} óra élőben · 28 nap`,
    followers: (value) => `${value} követő`,
    missingStreamer: 'Hiányzik a streamered? Keresd meg és add hozzá →',
    endcap: {
      title: 'Vidd magaddal a műsorodat.',
      bullets: [
        'Push-értesítés, amint a streamereid élőben vannak',
        'Következő-stream widget a kezdőképernyőn',
        'Kedvencek szinkronban — telefonon és weben',
      ],
      webLead: 'Inkább böngészőben?',
      webLink: 'Hozz létre ingyenes fiókot',
      webTail: '— a feeded már vár.',
    },
    sessionBanner: {
      text: 'Üdv újra — a személyes feeded készen áll.',
      cta: 'A feedemhez →',
    },
    sectionNav: {
      aria: 'Ugrás egy szakaszhoz',
      live: 'Élő',
      lineup: 'Ma',
      trending: 'Felkapott',
      clips: 'Klipek',
      stats: 'Számok',
      discover: 'Streamerek',
    },
  },
  hero: {
    claim: 'Műsorrend. Klipek. Statisztikák. Mind egy helyen.',
    ctaLogin: 'Jelentkezz be',
    ctaMid: ' vagy ',
    ctaApp: 'töltsd le az appot',
    ctaTail: ', hogy kövesd a kedvenc streamereidet.',
    ctaAppOnlyLink: 'Töltsd le az appot',
    ctaAppOnlyTail: ', hogy kövesd a kedvenc streamereidet.',
    kicker: 'Élő streamer-kalauz',
    badgeNew: 'Új',
    badgeLive: 'Már elérhető iOS-re és Androidra',
    titleLead: 'Élő stream műsorújság ',
    titleTail: '-csatornákhoz',
    subtitle: 'A streamerek tévéújsága.',
    bodyLead:
      'Egy feed a Twitchhez és a YouTube-hoz. Valós idejű élő státusz, MI által megjósolt következő streamek és nulla zaj. Ingyenes, fiók nélkül —',
    bodyLink: 'töltsd le az appot',
    bodyTail: 'az élő értesítésekhez.',
    appStoreSub: 'Töltsd le az',
    playSub: 'SZEREZD MEG:',
    phoneAlt: 'Egy streamer a ma esti műsort nézi a telefonján',
    phoneCaption: 'A ma esti felhozatal böngészése',
    statBothLabel: 'Két platform, egy kalauz',
    statFavoritesValue: 'A kedvenceid',
    statFavoritesLabel: 'Bármilyen csatornát hozzáadhatsz pár másodperc alatt',
    statApiValue: 'Nyilvános API',
    statApiLabel: 'Hamarosan · iratkozz fel a várólistára',
  },
  upcoming: {
    heading: 'Hamarosan következik',
    aria: 'Közelgő streamek',
    empty: 'Most éppen nincs betervezve semmi — nézz vissza hamarosan.',
  },
  trending: {
    heading: 'Felkapott a Twitchen',
    subtitle:
      'A Twitch legnagyobb játékai éppen most — a streamereink még nem fedik le mindet.',
    aria: 'Felkapott játékok a Twitchen',
    rankOnTwitch: (rank) => `#${rank} a Twitchen`,
  },
  popular: {
    heading: 'Népszerű streamerek',
    viewAll: 'Összes streamer megtekintése →',
  },
  apiPromo: {
    heading: 'Fejlesztői API',
    comingSoon: 'Hamarosan',
    eyebrow: 'Fejlesztőknek',
    headlineLead: 'Építs ugyanezekre az adatokra —',
    headlineKey: 'hamarosan, a mi API-nkon.',
    body: 'Most vesszük fel az első pilot partnereket. Iratkozz fel a várólistára, és e-mailt küldünk, amint megnyílik a nyilvános hozzáférés — indie fejlesztőknek ingyenes csomaggal.',
    bullets: [
      'Valós idejű élő státusz és nézőszámok',
      'MI által megjósolt közelgő streamek megbízhatósági szinttel',
      'Webhookok az „élőbe ment” eseményekhez',
      'OpenAPI-specifikáció mellékelve',
    ],
    cta: 'Fel a várólistára',
  },
  live: {
    h1: 'Most élőben a Twitchen és a YouTube-on',
    intro: (liveCount, categoryCount, soonCount, soonHours = 6) =>
      `Jelenleg ${liveCount} streamer van élőben` +
      (categoryCount > 0 ? ` ${categoryCount} játékban és kategóriában` : '') +
      '.' +
      (soonCount > 0
        ? ` További ${soonCount} a következő ${soonHours} órában kezd a menetrend szerint.`
        : ''),
    introEmpty: 'Most senki sincs élőben — itt van, ki kezd hamarosan.',
    error: 'Az élő státusz átmenetileg nem érhető el. Próbáld újra egy pillanat múlva.',
    otherCategory: 'Egyéb',
    categoryLiveAria: (name) => `${name} — most élőben`,
    nLive: (n) => `${n} élőben`,
    jumpToGame: 'Ugrás egy játékhoz',
    startingSoon: 'Hamarosan kezdenek',
    nextNHours: (n) => `következő ${n} óra`,
    emptyAll:
      'Most semmi sincs élőben, és semmi sem indul mindjárt. Böngészd a teljes streamer-katalógust, vagy fedezz fel játékokat a következő streamedhez.',
    itemListName: 'Éppen élőben lévő streamerek a Twitchen és a YouTube-on',
  },
  streamers: {
    h1: 'Az összes Twitch- és YouTube-streamer A–Z',
    intro:
      'A Streamer Timeson követett összes streamer — nézd meg, ki van élőben, és mit streamel legközelebb. Lapozd végig a teljes listát oldalról oldalra.',
    pageOf: (page, totalPages) => `${page}. oldal, összesen ${totalPages}.`,
    error: 'A streamerek átmenetileg nem érhetők el. Próbáld újra egy pillanat múlva.',
    paginationAria: 'Lapozás',
    prev: '← Előző',
    next: 'Következő →',
  },
  games: {
    liveRightNow: 'Most élőben',
    liveAria: 'Játékok élő streamekkel',
    error: 'A játékok átmenetileg nem érhetők el. Próbáld újra egy pillanat múlva.',
    aboutHeading: 'Ezekről a játékokról',
    updatedAt: (stamp) => `Frissítve: ${stamp}.`,
    relatedAria: 'Kapcsolódó oldalak',
  },
  gamesRoot: {
    h1: 'A legnépszerűbb játékok a Twitchen és a YouTube-on',
    methodologyNote:
      'Aszerint rendezve, hogy hány streamert követünk az egyes kategóriákban az elmúlt 28 napban.',
    intro: (gameCount, liveStreamerCount, liveGameCount) => {
      const lead = `${gameCount} játékot és kategóriát követünk a Twitchen és a YouTube-on.`;
      const note =
        'Aszerint rendezve, hogy hány streamert követünk az egyes kategóriákban az elmúlt 28 napban.';
      if (liveStreamerCount <= 0) return `${lead} ${note}`;
      const streamers = `Jelenleg ${formatCompactNumber(liveStreamerCount, 'hu')} streamer van élőben`;
      const across = liveGameCount > 0 ? ` ${liveGameCount} kategóriában` : '';
      return `${lead} ${streamers}${across}. ${note}`;
    },
    faqPopularQ: 'Melyik a legnépszerűbb játék a Twitchen és a YouTube-on?',
    faqPopularA: (top, second) =>
      `A(z) ${top.category} gyűjti a legtöbb általunk követett streamert — ${top.count} csatorna streamelte az elmúlt 28 napban${second ? `, megelőzve a(z) ${second.category}-t (${second.count})` : ''}.`,
    faqWhoQ: 'Ki streamel éppen most?',
    faqWhoA: (liveStreamerCount, liveGameCount) =>
      `${liveStreamerCount} streamer van élőben ${liveGameCount} kategóriában. Nyiss meg egy kategóriát az élő csatornákhoz és a közelgő streamjeikhez.`,
    faqRankedQ: 'Hogyan rangsoroljuk ezeket a játékokat?',
    faqRankedA: (gameCount) =>
      `Aszerint rendezve, hogy hány streamert követünk az egyes kategóriákban az elmúlt 28 napban. A számok ${gameCount} játék befejezett adásainak éjszakai összesítéséből származnak; az élő adatok néhány percenként frissülnek.`,
    faqHoursQ: 'A „streamelt órák” nézési időt jelentenek?',
    faqHoursA:
      'Nem. A streamelt órák azt mérik, mennyi ideig voltak élőben a streamerek egy kategóriában. A nézők nézési idejét nem mérjük; a kártyákon látható élő nézőszám pillanatnyi minta, nem összeg.',
  },
  rankings: {
    h1: 'Streamer-ranglisták',
    intro: (n) =>
      `Kik a legnagyobb, leggyorsabban növekvő, legszorgalmasabb és legmegbízhatóbb streamerek a Twitchen és a YouTube-on? ${n} ranglista az összes követett streamerről — naponta frissítve valódi adásadatokból.`,
    dataRefreshed: (label) => ` Adatok frissítve: ${label}.`,
    statStreamersTracked: 'követett streamer',
    statLiveNow: 'most élőben',
    statGamesCategories: 'játék és kategória',
    seeFullRanking: 'A teljes ranglista →',
    warmingUp: 'A ranglisták még bemelegítenek — nézz vissza hamarosan.',
    byGameHeading: 'Ranglisták játékonként',
    byGameSubtitle: 'A legtöbb követővel rendelkező streamerek játékonként és kategóriánként.',
    byGameAria: 'Népszerű játék-ranglisták',
    topGameStreamers: (category) => `A legjobb ${category}-streamerek`,
    whoIsLive: 'Ki van most élőben?',
    climbersThisWeek: 'A hét legnagyobb feltörekvői',
    metricH1: {
      'most-followed': 'A legtöbb követővel rendelkező streamerek',
      'fastest-growing': 'A leggyorsabban növekvő streamerek',
      'most-watched': 'A legnézettebb streamerek',
      'most-active': 'A legaktívabb streamerek',
      'most-reliable': 'A legpontosabb streamerek',
    },
    metricNote: {
      'most-followed':
        'Naponta frissítve. A követő- és feliratkozószámokat rendszeresen frissítjük, ezért elmaradhatnak a platformok élő számaitól.',
      'fastest-growing':
        'A csatornakövetők (Twitch) vagy feliratkozók (YouTube) gyarapodása az elmúlt 7 napban, minden követett csatorna napi pillanatképeiből. Csak a pozitívan növekvő csatornák kerülnek rangsorba. Naponta frissítve.',
      'most-watched':
        'Az egyidejű élő nézők mediánja az elmúlt 28 napban (óránkénti mintavétel). Naponta frissítve.',
      'most-active':
        'Összes élőben töltött óra az elmúlt 28 napban. Minden stream egyszer számít; a 24/7-es, folyamatosan élő csatornák kizárva. Naponta frissítve.',
      'most-reliable':
        'A Twitchen beharangozott streamek aránya, amelyek tényleg ±30 percen belül elindultak, az utolsó 20 beharangozott stream alapján 90 napon belül (legalább 10 kiértékelt). Naponta frissítve.',
    },
  },
};
