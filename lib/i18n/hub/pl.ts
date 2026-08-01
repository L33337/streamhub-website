import { formatCompactNumber } from '@/lib/format/number';
import { pluralForms } from '@/lib/i18n-core';
import type { HubLex } from './types';

/** "3 streamerów nadaje" — counted streamers with correct Polish forms. */
const nStreamers = (n: number): string =>
  pluralForms('pl', n, {
    one: `${n} streamer`,
    few: `${n} streamerów`,
    many: `${n} streamerów`,
    other: `${n} streamera`,
  });

/** "20 transmisji" — counted broadcasts for the Streamer Wiki stats line. */
const nStreams = (n: number): string =>
  pluralForms('pl', n, {
    one: `${n} transmisja`,
    few: `${n} transmisje`,
    many: `${n} transmisji`,
    other: `${n} transmisji`,
  });

/** "od 3 streamerów" — genitive after "od" (quick fact: category of the week). */
const fromNStreamers = (n: number): string =>
  pluralForms('pl', n, {
    one: `${n} streamera`,
    other: `${n} streamerów`,
  });

/** "po 16 dniach" — locative after "po" (quick fact: comeback of the week). */
const afterNDays = (n: number): string =>
  pluralForms('pl', n, {
    one: `${n} dniu`,
    other: `${n} dniach`,
  });

/** "w 3 kategoriach" — locative counted categories. */
const inCategories = (n: number): string =>
  pluralForms('pl', n, {
    one: `w ${n} kategorii`,
    other: `w ${n} kategoriach`,
  });

export const pl: HubLex = {
  crumbs: {
    aria: 'Ścieżka nawigacji',
    home: 'Strona główna',
    liveNow: 'Teraz na żywo',
    games: 'Gry',
    streamers: 'Streamerzy',
    rankings: 'Rankingi',
    pageN: (n) => `Strona ${n}`,
  },
  common: {
    browseStreamersAZ: 'Wszyscy streamerzy od A do Z',
    allGamesCategories: 'Wszystkie gry i kategorie',
  },
  home: {
    browseAllGames: 'Przeglądaj wszystkie gry i kategorie →',
    seeLiveNow: 'Zobacz, kto jest teraz na żywo →',
  },
  homeFeed: {
    // Styl z dwukropkiem zamiast odmiany liczebników.
    ticker: (liveCount, soonCount, soonHours) => {
      const live = liveCount > 0 ? `Na żywo teraz: ${liveCount}` : '';
      const soon =
        soonCount > 0
          ? `startują w ciągu ${soonHours} godzin: ${soonCount}`
          : '';
      return live && soon ? `${live} · ${soon}` : live || soon;
    },
    liveTitle: 'Najczęściej oglądani teraz',
    liveFilterCategory: 'Kategoria',
    liveFilterLanguage: 'Język',
    liveFilterAllCategories: 'Wszystkie kategorie',
    liveFilterAllLanguages: 'Wszystkie języki',
    liveFilterOption: (label, count) => `${label} (${count})`,
    liveFilterMatches: (count) => `Transmisje: ${count}`,
    liveFilterReset: 'Wyczyść',
    liveFilterEmpty: 'Żadna transmisja nie pasuje teraz do tych filtrów.',
    liveFilterNote: (top, total) =>
      `Top ${top} wg liczby widzów — filtry przeszukują wszystkie transmisje (${total})`,
    upNextTitle: 'Dzisiejszy program',
    upNextLink: 'Na żywo i wkrótce →',
    lineupFilterTime: 'Godzina',
    lineupFilterAllTimes: 'Dowolna godzina',
    lineupFilterFrom: (time) => `Od ${time}`,
    lineupFilterMatches: (count) => `Transmisje: ${count}`,
    lineupFilterEmpty: 'Żadna transmisja nie pasuje do tych filtrów.',
    chipAll: 'Wszystko',
    chipFavorites: 'Moje ulubione',
    lineupShowAll: (n) => `Pokaż wszystkie streamy (${n})`,
    lineupShowMore: (n) => `Pokaż kolejne (${n})`,
    lineupShowLess: 'Pokaż mniej',
    bellAria: (name) => `Powiadomienie, gdy ${name} zacznie streamować`,
    upsell: {
      bellTitle: 'Nie przegap żadnego streama',
      bellBody:
        'Dostań powiadomienie push tuż przed startem streama — w darmowej aplikacji Streamer Times.',
      favoritesTitle: 'Twoi ulubieni na wyciągnięcie ręki',
      favoritesBody:
        'Obserwuj streamerów i przefiltruj tę stronę do własnego programu — za darmo, w aplikacji albo tutaj, w przeglądarce.',
      appCta: 'Pobierz aplikację',
      loginCta: 'Zaloguj się za darmo',
      close: 'Może później',
    },
    interrupt: {
      title: 'Ta strona — tylko z Twoimi streamerami.',
      body: 'Obserwuj swoich streamerów, a przewodnik stanie się Twoim osobistym feedem: Twój program, powiadomienia push tuż przed startem i ich najlepsze momenty tygodnia.',
      note: 'Zajmie 30 sekund · za darmo',
      appCta: 'Pobierz aplikację',
      loginCta: 'Zaloguj się w przeglądarce',
    },
    clipsTitle: 'Klipy tygodnia',
    clipsFilterMatches: (count) => `Klipy: ${count}`,
    clipsFilterEmpty: 'Żaden klip nie pasuje do tych filtrów.',
    quickFactsTitle: 'Szybkie fakty',
    quickFactsSub: 'Liczby ze streamów, które śledzimy',
    factPredictionLabel: 'Sprawdzian prognoz',
    factPrediction: (hits, total) =>
      `W ${hits} z ${total} prognoz o wysokim prawdopodobieństwie stream zaczął się w ciągu dwóch godzin od przewidywanej pory.`,
    factPeakLabel: 'Szczyt tygodnia',
    factPeak: (name) =>
      `${name} osiągnął w tym tygodniu najwyższą liczbę widzów jednocześnie.`,
    factReliableLabel: 'Co do minuty',
    factReliable: (name, hits, total) =>
      `${name} punktualnie zaczął ${hits} z ${total} ostatnich zapowiedzianych streamów.`,
    factPauseLabel: 'Na przerwie',
    factPause: (name) => `${name} ma przerwę do tej daty.`,
    factMarathonLabel: 'Maraton tygodnia',
    factMarathon: (name) => `Tyle ${name} był na żywo bez przerwy.`,
    factComebackLabel: 'Powrót tygodnia',
    factComeback: (name, days) =>
      `${name} wraca po ${afterNDays(days)} bez transmisji.`,
    factPrimeTimeLabel: 'Prime time',
    factPrimeTime: (total) =>
      `O tej godzinie startuje najwięcej transmisji — z ${total} transmisji w 4 tygodnie.`,
    factBusiestDayLabel: 'Najbardziej zapełniony dzień',
    factBusiestDay: (total) =>
      `Dzień tygodnia, w którym startuje najwięcej transmisji — z ${total} transmisji w 4 tygodnie.`,
    factLocalTimeNote: 'twoja strefa czasowa',
    factUtcNote: 'UTC',
    factTopCategoryLabel: 'Kategoria tygodnia',
    factTopCategory: (category, streamers) =>
      `Transmisje w ${category} z ostatnich 7 dni, od ${fromNStreamers(streamers)}.`,
    factCompetitionLabel: 'Poziom konkurencji',
    factCompetition: (category) =>
      `Tyle śledzonych kanałów nadaje w ${category} jednocześnie, średnio — najbardziej zatłoczona kategoria u nas.`,
    factRoomLabel: 'Wolna nisza',
    factRoom: (category, channels) =>
      `Widzowie na kanał w ${category} — przy zaledwie ${channels} śledzonych kanałach na żywo jednocześnie.`,
    factRoomSlotLabel: 'Najlepsza pora',
    risersTitle: 'Wzloty tygodnia',
    risersLink: 'Wszystkie rankingi →',
    risersGained: (delta) => `${delta} obserwujących w 7 dni`,
    mostStreamedTitle: 'Najwięcej streamowali w tym tygodniu',
    weekHours: (value) => `${value} godz. na żywo · 7 dni`,
    weekStreams: (n) => `streamów: ${n}`,
    mostWatchedTitle: 'Najczęściej oglądani',
    topStreamersCol: 'Top 5 streamerów',
    topCategoriesCol: 'Top 5 kategorii',
    medianViewers: (value) => `${value} widzów (mediana)`,
    hoursStreamed: (value) => `${value} godz. na żywo · 28 dni`,
    followers: (value) => `${value} obserwujących`,
    missingStreamer: 'Brakuje Twojego streamera? Wyszukaj i dodaj →',
    endcap: {
      title: 'Zabierz swój program ze sobą.',
      bullets: [
        'Obserwuj swoich ulubionych streamerów',
        'Zobacz, kto i kiedy wchodzi na żywo',
        'Staty, klipy i więcej!',
      ],
      webLead: 'Wolisz przeglądarkę?',
      webLink: 'Załóż darmowe konto',
      webTail: '— Twój feed już czeka.',
    },
    sessionBanner: {
      text: 'Witaj z powrotem — Twój osobisty feed jest gotowy.',
      cta: 'Do mojego feedu →',
    },
    sectionNav: {
      aria: 'Przejdź do sekcji',
      live: 'Na żywo',
      lineup: 'Dziś',
      trending: 'Na czasie',
      clips: 'Klipy',
      stats: 'Liczby',
      discover: 'Streamerzy',
    },
  },
  hero: {
    claim: 'Harmonogram. Klipy. Statystyki. Wszystko w jednym miejscu.',
    ctaLogin: 'Zaloguj się',
    ctaMid: ' lub ',
    ctaApp: 'pobierz aplikację',
    ctaTail: ', aby obserwować swoich ulubionych streamerów.',
    ctaAppOnlyLink: 'Pobierz aplikację',
    ctaAppOnlyTail: ', aby obserwować swoich ulubionych streamerów.',
    kicker: 'Przewodnik po streamach na żywo',
    badgeNew: 'Nowość',
    badgeLive: 'Już dostępne na iOS i Androida',
    titleLead: 'Rozkład streamów na żywo dla ',
    titleTail: '',
    subtitle: 'Program TV dla streamerów.',
    bodyLead:
      'Jeden feed dla Twitcha i YouTube. Status na żywo w czasie rzeczywistym, kolejne streamy przewidywane przez AI i zero szumu. Za darmo, bez konta —',
    bodyLink: 'pobierz aplikację',
    bodyTail: 'i otrzymuj powiadomienia o streamach.',
    appStoreSub: 'Pobierz w',
    playSub: 'POBIERZ Z',
    phoneAlt: 'Streamerka przegląda dzisiejszy program na telefonie',
    phoneCaption: 'Przegląd dzisiejszego programu',
    statBothLabel: 'Dwie platformy, jeden przewodnik',
    statFavoritesValue: 'Twoje ulubione',
    statFavoritesLabel: 'Dodaj dowolny kanał w kilka sekund',
    statApiValue: 'Publiczne API',
    statApiLabel: 'Wkrótce · zapisz się na listę oczekujących',
  },
  upcoming: {
    heading: 'Wkrótce w programie',
    aria: 'Nadchodzące streamy',
    empty: 'W tej chwili nic nie jest zaplanowane — wróć niedługo.',
  },
  trending: {
    heading: 'Na topie na Twitchu',
    subtitle:
      'To, co ogląda teraz cały Twitch.',
    aria: 'Popularne gry na Twitchu',
    rankOnTwitch: (rank) => `#${rank} na Twitchu`,
    sortAria: 'Sortuj gry',
    sortTwitch: 'Twitch',
    sortHours: 'Godziny',
    sortViewers: 'Widzowie',
    sortStreamers: 'Streamerzy',
    liveViewers: (value) => `${value} ogląda teraz`,
    streamerCount: (value, count) =>
      pluralForms('pl', count, {
        one: `${value} streamer`,
        few: `${value} streamerów`,
        many: `${value} streamerów`,
        other: `${value} streamera`,
      }),
  },
  popular: {
    heading: 'Popularni streamerzy',
    viewAll: 'Zobacz wszystkich streamerów →',
  },
  streamerWiki: {
    heading: 'Streamer Wiki',
    subline: 'Kim są, w co grają i kiedy wchodzą na żywo.',
    viewAll: 'Przeglądaj wszystkich streamerów →',
    followers: (value) => `≈${value} obserwujących`,
    streams28d: (count) => `${nStreams(count)} w 28 dni`,
    liveNow: 'Teraz na żywo',
    nextPrefix: 'Następna',
  },
  apiPromo: {
    heading: 'API dla deweloperów',
    comingSoon: 'Wkrótce',
    eyebrow: 'Dla deweloperów',
    headlineLead: 'Buduj na tych samych danych —',
    headlineKey: 'wkrótce, przez nasze API.',
    body: 'Właśnie wdrażamy pierwszych partnerów pilotażowych. Zapisz się na listę oczekujących, a napiszemy do Ciebie, gdy tylko otworzymy publiczny dostęp — z darmowym planem dla niezależnych twórców.',
    bullets: [
      'Status na żywo i liczba widzów w czasie rzeczywistym',
      'Nadchodzące streamy przewidywane przez AI z poziomem pewności',
      'Webhooki dla zdarzeń „wszedł na żywo”',
      'Specyfikacja OpenAPI w zestawie',
    ],
    cta: 'Zapisz się na listę',
  },
  live: {
    h1: 'Teraz na żywo na Twitchu i YouTube',
    intro: (liveCount, categoryCount, soonCount, soonHours = 6) =>
      `W tej chwili na żywo jest ${nStreamers(liveCount)}` +
      (categoryCount > 0
        ? ` ${pluralForms('pl', categoryCount, {
            one: `w ${categoryCount} grze i kategorii`,
            other: `w ${categoryCount} grach i kategoriach`,
          })}`
        : '') +
      '.' +
      (soonCount > 0
        ? ` ${pluralForms('pl', soonCount, {
            one: `Kolejny ${soonCount} ma zacząć`,
            other: `Kolejnych ${soonCount} ma zacząć`,
          })} w ciągu najbliższych ${soonHours} godzin.`
        : ''),
    introEmpty: 'W tej chwili nikt nie streamuje — oto kto zaczyna niedługo.',
    error: 'Status na żywo jest chwilowo niedostępny. Spróbuj ponownie za chwilę.',
    otherCategory: 'Inne',
    categoryLiveAria: (name) => `${name} — teraz na żywo`,
    nLive: (n) => `${n} na żywo`,
    jumpToGame: 'Przejdź do gry',
    startingSoon: 'Zaczynają wkrótce',
    nextNHours: (n) => `najbliższe ${n} godzin`,
    emptyAll:
      'W tej chwili nic nie jest na żywo i nic zaraz się nie zaczyna. Przejrzyj pełny katalog streamerów albo odkrywaj gry, by znaleźć swój następny stream.',
    itemListName: 'Streamerzy nadający teraz na żywo na Twitchu i YouTube',
  },
  streamers: {
    h1: 'Wszyscy streamerzy Twitcha i YouTube od A do Z',
    intro:
      'Wszyscy streamerzy śledzeni w Streamer Times — zobacz, kto jest na żywo i co będą streamować dalej. Przeglądaj pełną listę strona po stronie.',
    pageOf: (page, totalPages) => `Strona ${page} z ${totalPages}.`,
    error: 'Streamerzy są chwilowo niedostępni. Spróbuj ponownie za chwilę.',
    paginationAria: 'Paginacja',
    prev: '← Poprzednia',
    next: 'Następna →',
  },
  games: {
    liveRightNow: 'Teraz na żywo',
    liveAria: 'Gry z aktywnymi streamami',
    error: 'Gry są chwilowo niedostępne. Spróbuj ponownie za chwilę.',
    aboutHeading: 'O tych grach',
    updatedAt: (stamp) => `Zaktualizowano o ${stamp}.`,
    relatedAria: 'Powiązane strony',
  },
  gamesRoot: {
    h1: 'Najpopularniejsze gry na Twitchu i YouTube',
    methodologyNote:
      'Uporządkowane według liczby streamerów, których śledzimy w każdej kategorii przez ostatnie 28 dni.',
    intro: (gameCount, liveStreamerCount, liveGameCount) => {
      const lead = `Śledzimy ${pluralForms('pl', gameCount, {
        one: `${gameCount} grę`,
        few: `${gameCount} gry`,
        many: `${gameCount} gier`,
        other: `${gameCount} gry`,
      })} i kategorie na Twitchu i YouTube.`;
      const note =
        'Uporządkowane według liczby streamerów, których śledzimy w każdej kategorii przez ostatnie 28 dni.';
      if (liveStreamerCount <= 0) return `${lead} ${note}`;
      const streamers = `W tej chwili na żywo jest ${formatCompactNumber(liveStreamerCount, 'pl')} ${pluralForms(
        'pl',
        liveStreamerCount,
        {
          one: 'streamer',
          few: 'streamerów',
          many: 'streamerów',
          other: 'streamera',
        },
      )}`;
      const across = liveGameCount > 0 ? ` ${inCategories(liveGameCount)}` : '';
      return `${lead} ${streamers}${across}. ${note}`;
    },
    faqPopularQ: 'Jaka jest najpopularniejsza gra na Twitchu i YouTube?',
    faqPopularA: (top, second) =>
      `${top.category} ma najwięcej śledzonych przez nas streamerów — ${pluralForms('pl', top.count, {
        one: `${top.count} kanał streamował ją`,
        few: `${top.count} kanały streamowały ją`,
        many: `${top.count} kanałów streamowało ją`,
        other: `${top.count} kanału streamowało ją`,
      })} w ciągu ostatnich 28 dni${second ? `, przed ${second.category} z wynikiem ${second.count}` : ''}.`,
    faqWhoQ: 'Kto streamuje w tej chwili?',
    faqWhoA: (liveStreamerCount, liveGameCount) =>
      `Na żywo jest ${nStreamers(liveStreamerCount)} ${inCategories(liveGameCount)}. Otwórz dowolną kategorię, by zobaczyć kanały na żywo i ich nadchodzące streamy.`,
    faqRankedQ: 'Jak te gry są klasyfikowane?',
    faqRankedA: (gameCount) =>
      `Uporządkowane według liczby streamerów, których śledzimy w każdej kategorii przez ostatnie 28 dni. Liczby pochodzą z nocnej agregacji zakończonych transmisji z ${pluralForms('pl', gameCount, {
        one: `${gameCount} gry`,
        other: `${gameCount} gier`,
      })}; dane na żywo odświeżają się co kilka minut.`,
    faqHoursQ: 'Czy „przestreamowane godziny” to czas oglądania?',
    faqHoursA:
      'Nie. Przestreamowane godziny mierzą, jak długo streamerzy byli na żywo w danej kategorii. Nie mierzymy czasu oglądania widzów; liczby widzów na kartach to bieżąca próbka, a nie suma.',
  },
  rankings: {
    h1: 'Rankingi streamerów',
    intro: (n) =>
      `Kim są najwięksi, najszybciej rosnący, najbardziej pracowici i najbardziej niezawodni streamerzy na Twitchu i YouTube? ${n} ${pluralForms('pl', n, {
        one: 'ranking',
        few: 'rankingi',
        many: 'rankingów',
        other: 'rankingu',
      })} obejmujące wszystkich śledzonych przez nas streamerów — aktualizowane codziennie na podstawie prawdziwych danych z transmisji.`,
    dataRefreshed: (label) => ` Dane odświeżono ${label}.`,
    statStreamersTracked: 'śledzonych streamerów',
    statLiveNow: 'teraz na żywo',
    statGamesCategories: 'gier i kategorii',
    seeFullRanking: 'Zobacz pełny ranking →',
    warmingUp: 'Rankingi dopiero się rozgrzewają — wróć niedługo.',
    byGameHeading: 'Rankingi według gier',
    byGameSubtitle: 'Streamerzy z największą liczbą obserwujących w każdej grze i kategorii.',
    byGameAria: 'Rankingi popularnych gier',
    topGameStreamers: (category) => `Najlepsi streamerzy ${category}`,
    whoIsLive: 'Kto jest teraz na żywo?',
    climbersThisWeek: 'Największe awanse tygodnia',
    metricH1: {
      'most-followed': 'Najczęściej obserwowani streamerzy',
      'fastest-growing': 'Najszybciej rosnący streamerzy',
      'most-watched': 'Najchętniej oglądani streamerzy',
      'most-active': 'Najaktywniejsi streamerzy',
      'most-reliable': 'Najpunktualniejsi streamerzy',
    },
    metricNote: {
      'most-followed':
        'Aktualizowane codziennie. Liczby obserwujących i subskrybentów są odświeżane regularnie i mogą być opóźnione względem liczb na platformach.',
      'fastest-growing':
        'Przyrost obserwujących kanał (Twitch) lub subskrybentów (YouTube) w ciągu ostatnich 7 dni, z codziennych migawek każdego śledzonego kanału. W rankingu są tylko kanały z dodatnim wzrostem. Aktualizowane codziennie.',
      'most-watched':
        'Mediana jednoczesnych widzów na żywo z ostatnich 28 dni (próbkowanie co godzinę). Aktualizowane codziennie.',
      'most-active':
        'Łączna liczba godzin na żywo w ciągu ostatnich 28 dni. Każdy stream liczy się raz; kanały nadające 24/7 są wykluczone. Aktualizowane codziennie.',
      'most-reliable':
        'Odsetek zapowiedzianych streamów na Twitchu, które faktycznie zaczęły się w granicach ±30 minut, z ostatnich 20 zapowiedzianych streamów w ciągu 90 dni (minimum 10 ocenionych). Aktualizowane codziennie.',
    },
  },
};
