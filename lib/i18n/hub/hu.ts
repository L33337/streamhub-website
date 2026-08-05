import { formatCompactNumber } from '@/lib/format/number';
import { listConjunction } from '@/lib/i18n-core';
import type { HubLex } from './types';

export const hu: HubLex = {
  crumbs: {
    aria: 'Morzsamenü',
    home: 'Főoldal',
    liveNow: 'Most élőben',
    tonight: 'Ma este',
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
    qrTitle: 'Szkenneld be a Streamer Times letöltéséhez',
    qrHeading: 'Szkenneld be a letöltéshez',
    qrHint: 'Irányítsd ide a telefonod kameráját',
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
    liveFilterNote: (top, total) =>
      `Top ${top} a jelenlegi nézőszám alapján — a szűrők mind a(z) ${total} élő adásban keresnek`,
    upNextTitle: 'A mai műsor',
    upNextLink: 'Élő és hamarosan induló →',
    lineupFilterTime: 'Időpont',
    lineupFilterAllTimes: 'Bármikor',
    lineupFilterFrom: (time) => `${time}-tól`,
    lineupFilterMatches: (count) => `${count} adás`,
    lineupFilterEmpty: 'Egyetlen adás sem felel meg ezeknek a szűrőknek.',
    chipAll: 'Mind',
    chipFavorites: 'Kedvenceim',
    lineupShowAll: (n) => `Mind a(z) ${n} stream megjelenítése`,
    lineupShowMore: (n) => `Még ${n} megjelenítése`,
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
    clipsFilterMatches: (count) => `${count} klip`,
    clipsFilterEmpty: 'Egy klip sem felel meg ezeknek a szűrőknek.',
    quickFactsTitle: 'Gyors tények',
    quickFactsSub: 'Számok az általunk követett streamekből',
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
    factMarathonLabel: 'A hét maratonja',
    factMarathon: (name) => `Ennyi ideig volt ${name} egyhuzamban élőben.`,
    factComebackLabel: 'A hét visszatérése',
    factComeback: (name, days) => `${name} ${days} stream nélküli nap után tért vissza.`,
    factPrimeTimeLabel: 'Főműsoridő',
    factPrimeTime: (total) =>
      `Ebben az órában indul a legtöbb stream — 4 hét ${total} adása alapján.`,
    factBusiestDayLabel: 'A legsűrűbb nap',
    factBusiestDay: (total) =>
      `A hét napja, amikor a legtöbb stream indul — 4 hét ${total} adása alapján.`,
    factLocalTimeNote: 'a te időzónád',
    factUtcNote: 'UTC',
    factTopCategoryLabel: 'A hét kategóriája',
    factTopCategory: (category, streamers) =>
      `${category} streamek az elmúlt 7 napban, ${streamers} streamertől.`,
    factCompetitionLabel: 'Versenyszint',
    factCompetition: (category) =>
      `Ennyi követett csatorna van átlagosan egyszerre élőben a(z) ${category} kategóriában — nálunk ez a legzsúfoltabb.`,
    factRoomLabel: 'Szabad rés',
    factRoom: (category, channels) =>
      `Nézők csatornánként a(z) ${category} kategóriában — mindössze ${channels} követett csatorna van egyszerre élőben.`,
    factRoomSlotLabel: 'A legjobb időpont',
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
        'Kövesd a kedvenc streamereidet',
        'Nézd meg, ki mikor megy élőben',
        'Statok, klipek és még sok minden!',
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
      'Amit most az egész Twitch néz.',
    aria: 'Felkapott játékok a Twitchen',
    rankOnTwitch: (rank) => `#${rank} a Twitchen`,
    sortAria: 'Játékok rendezése',
    sortTwitch: 'Twitch',
    sortHours: 'Órák',
    sortViewers: 'Nézők',
    sortStreamers: 'Streamerek',
    liveViewers: (value) => `${value} nézi most`,
    streamerCount: (value) => `${value} streamer`,
  },
  popular: {
    heading: 'Népszerű streamerek',
    viewAll: 'Összes streamer megtekintése →',
  },
  streamerWiki: {
    heading: 'Streamer Wiki',
    subline: 'Kik ők, mivel játszanak, és mikor mennek élőben.',
    viewAll: 'Összes streamer böngészése →',
    followers: (value) => `≈${value} követő`,
    // Hungarian counted nouns stay singular after a numeral ("20 adás").
    streams28d: (count) => `${count} adás 28 nap alatt`,
    liveNow: 'Most élőben',
    nextPrefix: 'Következő',
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
  tonight: {
    h1: 'Ki streamel ma este?',
    h1Night: 'Ki streamel az éjjel',
    intro: (total, names) =>
      `Ma estére ${total} stream van betervezve a Twitchen és a YouTube-on` +
      (names ? `, köztük ${names}` : '') +
      '.',
    introEmpty:
      'Ma estére még nincs semmi betervezve. Az előrejelzések a nap folyamán töltődnek fel, ahogy a streamerek befejezik az aktuális adásaikat.',
    timesInZone: (zone) => `Minden időpont ${zone} szerint`,
    timesLocal: 'Minden időpont a te időzónádban',
    error: 'A ma esti műsor átmenetileg nem érhető el. Próbáld újra egy pillanat múlva.',
    jumpAria: 'Ugrás az este egy időpontjához',
    liveNowHeading: 'Már élőben',
    liveNowLink: 'Nézd meg, ki van most élőben',
    primetimeHeading: 'A ma este fénypontjai',
    primetimeSub: (time) => `A legnagyobb nevek, akik ${time} körül kezdenek élőben.`,
    blockFrom: (time) => `${time}-tól`,
    blockNight: 'Késő éjjel',
    blockCount: (n) => `${n} stream`,
    quietBody:
      'Nézz vissza később, vagy nézd meg, ki van most élőben — az este általában 18 óra után telik meg.',
    aboutHeading: 'A ma esti műsorkalauzról',
    aboutBody:
      'Ez az oldal a Streamer Times esti nézete: minden Twitch- és YouTube-stream, amelyre 18 és 6 óra között számítunk, kezdési idő szerint csoportosítva, hogy úgy tervezhesd meg az estédet, mint egy tévéújsággal.',
    faqWhatQ: 'Mi megy ma este?',
    faqWhatA:
      'A fenti blokkok minden streamet felsorolnak, amelyet erre az estére bejelentettek vagy előre jeleztünk, a legkorábbival kezdve. A bejelentett streamek közvetlenül a streamer saját menetrendjéből származnak; a többit a streamelési előzményekből jelezzük előre, és minden kártyán ott a megbízhatósági jelzés.',
    faqHowQ: 'Honnan tudjátok, mikor streamel valaki?',
    faqHowA:
      'Követjük minden csatorna adásainak előzményeit és a bejelentéseit, majd ebből jelezzük előre a következő kezdést. A magas megbízhatóság erős, rendszeres mintát vagy bejelentett időpontot jelent; az alacsony azt, hogy a menetrend mostanában rendszertelen volt.',
    faqTimesQ: 'Melyik időzónában vannak az időpontok?',
    faqTimesA: (zone) =>
      `Az időpontok ${zone} szerint szerepelnek, és az oldal betöltése után átváltanak a saját időzónádra. Az este 18 órától 6 óráig tart, így az éjfél után kezdődő stream is a ma estéhez tartozik.`,
    itemListName: 'Ma esti streamek a Twitchen és a YouTube-on',
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
    dataRefreshed: (label) => ` Adatok frissítve: ${label}`,
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
    tableColStreamer: 'Streamer',
    tableColMainGame: 'Fő játék',
    tableColNextStream: 'Következő stream',
    tableHeaders: {
      'Followers': 'Követők',
      'Avg viewers': 'Átl. nézők',
      'Gained (7d)': 'Új követők (7 nap)',
      'Growth': 'Növekedés',
      'Followers now': 'Követők most',
      'Hours (28d)': 'Órák (28 nap)',
      'Streams / week': 'Stream / hét',
      'Avg duration': 'Átl. hossz',
      'On-time rate': 'Pontosság',
      'Typical deviation': 'Jellemző eltérés',
      'Streams evaluated': 'Értékelt streamek',
    },
    trendNewLabel: 'új',
    trendNewTitle: 'Egy hete még nem volt ebben a rangsorban',
    trendMoveTitle: (up, delta) => `${delta} hellyel ${up ? 'feljebb' : 'lejjebb'} a múlt hét óta`,
    mainGameShareTitle: (pct) => `A kategorizált streamek ${pct}%-a`,
    alwaysOnTitle: 'Always-on csatorna — éjjel-nappal élőben',
  },
  gamesExplorer: {
    sectionAria: 'Minden játék és kategória',
    sortAria: 'Játékok rendezése',
    sortLabels: { streamers: 'Legtöbb streamer', hours: 'Legtöbbet streamelt', trending: 'Felkapott' },
    viewTitles: {
      streamers: 'A legnépszerűbb játékok a Twitchen és a YouTube-on',
      hours: 'A legtöbbet streamelt játékok a Twitchen és a YouTube-on',
      trending: 'Felkapott játékok a Twitchen és a YouTube-on',
    },
    searchPlaceholder: 'Játék keresése…',
    searchAria: 'Játék keresése',
    noMatch: 'Nincs találat erre: „{q}”.',
  },
  gameChips: {
    aria: (category) => `${category} statisztikák`,
    streamersLabel: () => 'streamer',
    liveNowLabel: 'most élőben',
    watchingLabel: 'néző',
    streamedLabel: 'stream · 28 nap',
    streamsLabel: () => 'stream · 28 nap',
    peakLead: 'Csúcs: ',
    peakTail: ' néző · 28 nap',
    trendTail: ' ezen a héten',
    trendTitle: 'Az aktív streamerek számának változása az előző héthez képest',
  },
  game: {
    notFoundTitle: 'A játék nem található — StreamerTimes',
    metaTitle: (category) => `${category}-streamerek — Élőben, ranglisták és menetrend`,
    metaDescription: (category, names) => {
      const tail = `Ki van most élőben, közelgő streamek és AI által jósolt menetrendek Twitchen és YouTube-on.`;
      const namesLead =
        names.length > 0
          ? `A ${category}-ranglistát ${listConjunction(names, 'hu')} vezeti${names.length === 1 ? '' : 'k'}. `
          : '';
      const twoNamesLead =
        names.length > 1
          ? `A ${category}-ranglistát ${listConjunction(names.slice(0, 2), 'hu')} vezetik. `
          : '';
      return [
        `${namesLead}${tail}`,
        `${twoNamesLead}${tail}`,
        `A legtöbb követővel rendelkező ${category}-streamerek. ${tail}`,
        tail,
      ];
    },
    ogTitle: (category) => `${category}-streamerek — élőben, ranglisták és menetrend`,
    ogDescription: (category, names) => {
      const ogNames = names.length > 0 ? ` — ${listConjunction(names, 'hu')} —` : ':';
      return `A legtöbb követővel rendelkező ${category}-streamerek${ogNames} élő státusz és stream-menetrend Twitchen és YouTube-on.`;
    },
    h1: (category) => `${category}-streamerek — élőben és menetrend`,
    intro: (shown, category, liveCount, upcomingCount, superlative) =>
      `${shown} streamernek van élő vagy betervezett ${category}-streamje ezen a héten Twitchen és YouTube-on. ` +
      (liveCount > 0
        ? `${liveCount} most is élőben van`
        : 'Most senki sincs élőben') +
      (upcomingCount > 0
        ? `, és ${upcomingCount} stream jön a következő 7 napban.`
        : '.') +
      superlative,
    superlative: (category, name, value, isTwitch) =>
      ` A legtöbb ${isTwitch ? 'követője' : 'feliratkozója'} itt ${name} csatornájának van: ${value}.`,
    onPageAria: 'Ezen az oldalon',
    navLiveNow: 'Most élőben',
    navTopStreamers: 'Top streamerek',
    navBestTimes: 'Legjobb idők',
    navSchedule: 'Menetrend',
    navRelated: 'Hasonló játékok',
    followGame: (category) => `${category} követése`,
    followingLabel: 'Követed',
    watchingNow: (category) => `Most élőben: ${category}`,
    liveStreamsAria: (category) => `Élő ${category}-streamek`,
    moreLiveAria: (category) => `További élő ${category}-streamek`,
    showMoreLive: (n) => `Még ${n} élő csatorna megjelenítése`,
    moreLiveInRanking: (n, category) =>
      `Még ${n} élőben a teljes ${category}-ranglistán →`,
    liveUpdatesNote:
      'Az élő státusz és a nézőszámok néhány percenként frissülnek.',
    mostFollowed: (category) =>
      `A legtöbb követővel rendelkező ${category}-streamerek`,
    tableCaption: (category) =>
      `${category}-streamerek követők szerint rendezve, a következő várható streamjükkel`,
    thRank: '#',
    thStreamer: 'Streamer',
    thNextStream: 'Következő stream',
    thFollowers: 'Követők',
    thHours: 'Óra / 28 nap',
    liveNowCell: 'Most élőben',
    seeFullRanking: (category) =>
      `A teljes ${category}-ranglista (top 50) →`,
    whoStreams: (category) => `Streamerek, akik ${category}-t streamelnek`,
    whenStreamed: (category) => `Mikor streamelik a ${category}-t?`,
    heatmapSummary: (category) =>
      `A legtöbb ${category}-stream {peak}{tz} fut — az elmúlt 4 hét követett streamjei alapján.`,
    heatmapSummaryEmpty: 'Az elmúlt 4 hét követett streamjei alapján.',
    tzLocalSuffix: ' (a te idődben)',
    tzUtcSuffix: ' (UTC)',
    heatmapAria: (category) => `Heti streamelési hőtérkép: ${category}.`,
    heatmapAriaWithPeak: (category) =>
      `Heti streamelési hőtérkép: ${category}. Legaktívabb idősáv: {peak}.`,
    heatmapTooltip: '{day} {from}–{to} · {amount} stream 4 hét alatt',
    legendLess: 'Kevesebb',
    legendMore: 'Több',
    heatmapDayNames: [
      'hétfőnként',
      'keddenként',
      'szerdánként',
      'csütörtökönként',
      'péntekenként',
      'szombatonként',
      'vasárnaponként',
    ],
    bestTimeToStream: (category) => `A legjobb idő ${category} streameléséhez`,
    trendingBadge: '▲ Felkapott',
    bestTimeIntro: (category) =>
      `Streamereknek: azok az idősávok, amikor a ${category}-ban a legtöbb néző jut egy élő csatornára.`,
    fullHeatmapLink: 'Teljes lehetőség-hőtérkép és elemzés →',
    bestSlotsAria: 'Legjobb idősávok',
    viewersPerChannel: '~{score} néző/csatorna',
    timesLocalNote: 'Az idők a te időzónádban.',
    timesUtcNote: 'Az idők UTC-ben.',
    quietTitle: (category) => `Most nincs ${category}-stream`,
    quietBody: (category) =>
      `Az általunk követett ${category}-streamerek közül senki sincs élőben, és a következő 7 napban sem várható. A menetrendek és AI-előrejelzések naponta többször frissülnek — nézz vissza hamarosan.`,
    quietMeanwhile: 'Addig is',
    seeWhosLive: 'Nézd meg, ki van most élőben →',
    browseAllGames: 'Böngéssz az összes játék között',
    gameStreamersChip: (category) => `${category}-streamerek`,
    scheduleAria: (category) => `${category} stream-menetrend`,
    upcomingStreams: (category) => `Közelgő ${category}-streamek`,
    scheduleNote:
      'Az idők a te időzónádhoz igazodnak, mellettük a streamer saját ideje. A napok az UTC-naptárt követik, így egy késő esti stream a következő nap alatt jelenhet meg.',
    filterAria: 'Menetrend szűrése',
    allPlatforms: 'Minden platform',
    hideLowConfidence: 'Alacsony valószínűség elrejtése',
    moreLowConfidence: (n) =>
      `Még ${n} előrejelzés alacsony valószínűséggel`,
    lowConfAria: (label) => `Alacsony valószínűségű előrejelzések: ${label}`,
    hiddenNotShown: (n) =>
      `Még ${n} előrejelzés nem látható ezen a napon. A teljes menetrendet a streamer oldalán találod.`,
    relatedGames: 'Hasonló játékok',
    relatedGamesAria: 'Hasonló játékok',
    relatedNote:
      'Játékok, amelyek streamerei átfedésben voltak az elmúlt 28 napban.',
    allGamesFooter: '← Minden játék és kategória',
  },
  gameRanking: {
    notFoundTitle: 'Nem található — StreamerTimes',
    metaTitle: (category, page) =>
      page === 1
        ? `Top ${category}-streamerek — követők szerint`
        : `Top ${category}-streamerek — követők szerint — ${page}. oldal`,
    metaLeadIn: (name, value) => `${name} vezet ${value} követővel. `,
    metaDescription: (category, leadIn) => [
      `${leadIn}A legjobb ${category}-streamerek Twitchen és YouTube-on követők szerint rendezve, élő státusszal és következő streamekkel. Naponta frissítve.`,
      `${leadIn}A legjobb ${category}-streamerek követők szerint, élő státusszal és következő streamekkel.`,
      `A legjobb ${category}-streamerek Twitchen és YouTube-on követők szerint rendezve, élő státusszal és következő streamekkel. Naponta frissítve.`,
    ],
    ogTitle: (category) => `Top ${category}-streamerek — követők szerint`,
    h1: (category) => `Top ${category}-streamerek követők szerint`,
    introPage1: (count, category) =>
      `Az általunk követett top ${count} ${category}-streamer, a csatorna követői és feliratkozói szerint rendezve.`,
    topsTheList: (name, value, isTwitch) =>
      ` A listát ${name} vezeti ${value} ${isTwitch ? 'követővel' : 'feliratkozóval'}.`,
    introPageN: (from, to, total, category) =>
      `${from}–${to}. hely a ${total} általunk követett ${category}-streamer közül, a csatorna követői és feliratkozói szerint rendezve.`,
    methodology: (category) =>
      `Az elmúlt 28 napban a ${category}-ban aktív streamerek, követők szerint rendezve. A számok rendszeresen frissülnek, és lemaradhatnak a platformok élő értékeitől.`,
    followersRefreshed: (label) => ` Követőszámok frissítve: ${label}`,
    warmingUp:
      'Ez a ranglista még melegszik — kicsit több adat kell, mielőtt beszédes lenne. Nézz vissza hamarosan.',
    missingDataNote:
      '— azt jelenti, hogy még nem gyűlt össze elég adat arról a csatornáról, például nézőszám-mintavétel a frissen hozzáadott csatornáknál.',
    sortAria: 'Ranglista rendezése',
    sortFollowers: 'Legtöbb követő',
    sortHours: 'Legtöbb óra (28 nap)',
    sortViewers: 'Legnézettebb',
    filterLangAria: 'Szűrés nyelv szerint',
    allChip: 'Mind',
    noMatch: 'Egy streamer sem felel meg ennek a szűrőnek.',
    tableCaption: (category) => `${category}-streamerek követők szerint rendezve`,
    thRank: '#',
    thStreamer: 'Streamer',
    thFollowers: 'Követők',
    thAvgViewers: 'Átl. nézők',
    thHours: 'Óra (28 nap)',
    thShare: 'Játékarány',
    thShareTitle: (category) =>
      `A streamer legutóbbi streamjeinek ${category}-ra eső része`,
    thNextStream: 'Következő stream',
    liveNowCell: 'Most élőben',
    watchingTail: ' · {value} néző',
    trendNewBadge: 'új',
    trendNewTitle: 'Egy hete még nem volt ebben a ranglistában',
    trendUpTemplate: '{n} hellyel feljebb a múlt héthez képest',
    trendDownTemplate: '{n} hellyel lejjebb a múlt héthez képest',
    mainGameTemplate: 'Fő játék: a legutóbbi streamek {share}%-a',
    aboutRanking: 'Erről a ranglistáról',
    faqMostFollowedQ: (category) =>
      `Melyik ${category}-streamernek van a legtöbb követője?`,
    faqMostFollowedA: (category, top, second) => {
      const runnerUp = second ? `, megelőzve ${second.name} csatornáját (${second.value})` : '';
      return `Jelenleg ${top.name} a legtöbb ${top.isTwitch ? 'követővel' : 'feliratkozóval'} rendelkező ${category}-streamer az általunk követettek közül, ${top.value} követővel${runnerUp}. A számok naponta frissülnek.`;
    },
    faqHowManyQ: (category) => `Hány streamer streameli a ${category}-t?`,
    faqHowManyA: (category, count, activity) => {
      const tail = activity
        ? ` Együtt körülbelül ${activity.hours} órányi ${category}-t streameltek ${activity.streams} streamben az elmúlt 28 napban.`
        : '';
      return `Jelenleg ${count} streamert követünk, akik nemrég ${category}-t streameltek, vagy a menetrendjükben szerepel.${tail}`;
    },
    faqMeasuredQ: 'Hogyan mérjük ezt a ranglistát?',
    faqMeasuredA: (category) =>
      `Az elmúlt 28 napban a ${category}-ban aktív streamerek, a fő csatornájuk követőszáma szerint rendezve — csatornakövetők a Twitchen vagy feliratkozók a YouTube-on. Az óra- és arányoszlopok a befejezett ${category}-streamek éjszakai összesítéséből származnak.`,
    faqShareQ: 'Mit jelent a „Játékarány”?',
    faqShareA: (category) =>
      `A streamer legutóbbi streamjeinek ${category}-ra eső része. A 100% azt jelenti, hogy jelenleg ez az egyetlen játéka; az alacsony arány a kategória alkalmi látogatóját jelzi.`,
    relatedRankings: 'Hasonló ranglisták',
    relatedRankingsAria: 'Hasonló játékok ranglistái',
    liveAndSchedule: (category) => `Élőben és menetrend: ${category} →`,
    allRankings: 'Minden ranglista',
    paginationAria: (category) => `${category}-ranglista oldalai`,
    prev: '← Előző',
    next: 'Következő →',
  },
};
