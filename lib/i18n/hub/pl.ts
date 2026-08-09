import { formatCompactNumber } from '@/lib/format/number';
import { listConjunction, pluralForms } from '@/lib/i18n-core';
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
    tonight: 'Dziś wieczorem',
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
    qrTitle: 'Zeskanuj, aby pobrać Streamer Times',
    qrHeading: 'Zeskanuj, aby pobrać',
    qrHint: 'Skieruj tutaj aparat telefonu',
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
    upNextTonightLink: 'Cały wieczór →',
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
  tonight: {
    h1: 'Kto streamuje dziś wieczorem?',
    h1Night: 'Kto streamuje tej nocy',
    intro: (total, names) =>
      `Na dziś wieczór na Twitchu i YouTube ${pluralForms('pl', total, {
        one: 'czeka',
        few: 'czekają',
        many: 'czeka',
        other: 'czeka',
      })} ${nStreams(total)}` +
      (names ? `, w tym ${names}` : '') +
      '.',
    introEmpty:
      'Na dziś wieczór nie ma jeszcze nic zaplanowanego. Prognozy uzupełniają się w ciągu dnia, gdy streamerzy kończą swoje bieżące transmisje.',
    timesInZone: (zone) => `Wszystkie godziny w ${zone}`,
    timesLocal: 'Wszystkie godziny w Twojej strefie czasowej',
    error: 'Program na dziś wieczór jest chwilowo niedostępny. Spróbuj ponownie za chwilę.',
    jumpAria: 'Przejdź do pory wieczoru',
    liveNowHeading: 'Już na żywo',
    liveNowLink: 'Zobacz wszystkich, którzy są teraz na żywo',
    primetimeHeading: 'Najważniejsze dziś wieczorem',
    primetimeSub: (time) => `Najwięksi, którzy wchodzą na żywo około ${time}.`,
    blockFrom: (time) => `Od ${time}`,
    blockNight: 'Późna noc',
    blockCount: (n) => nStreams(n),
    quietBody:
      'Zajrzyj później albo zobacz, kto jest teraz na żywo — wieczór zwykle zapełnia się po 18:00.',
    aboutHeading: 'O przewodniku na dziś wieczór',
    aboutBody:
      'Ta strona to wieczorny widok Streamer Times: każda transmisja na Twitchu i YouTube, której spodziewamy się między 18:00 a 6:00, pogrupowana według godziny startu, żebyś mógł zaplanować wieczór jak z programem telewizyjnym.',
    faqWhatQ: 'Co jest dziś wieczorem?',
    faqWhatA:
      'Bloki powyżej wymieniają każdą transmisję zapowiedzianą lub przewidzianą na ten wieczór, od najwcześniejszej. Zapowiedziane transmisje pochodzą wprost z harmonogramu samego streamera; resztę przewidujemy na podstawie historii nadawania, a na każdej karcie widnieje odznaka pewności.',
    faqHowQ: 'Skąd wiecie, kiedy ktoś zacznie streamować?',
    faqHowA:
      'Śledzimy historię transmisji każdego kanału i jego zapowiedzi, a następnie przewidujemy kolejny start. Wysoka pewność oznacza silny, regularny schemat albo zapowiedzianą datę; niska oznacza, że harmonogram był ostatnio nieregularny.',
    faqTimesQ: 'W jakiej strefie czasowej podane są godziny?',
    faqTimesA: (zone) =>
      `Godziny są podane w ${zone} i przełączają się na Twoją własną strefę czasową po załadowaniu strony. Wieczór trwa od 18:00 do 6:00, więc transmisja zaczynająca się po północy wciąż należy do dzisiejszego wieczoru.`,
    itemListName: 'Transmisje dziś wieczorem na Twitchu i YouTube',
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
    filterEmpty: 'Żaden streamer w tym rankingu nie pasuje do tych filtrów.',
    filterError: 'Nie udało się wczytać przefiltrowanego rankingu.',
    filterRetry: 'Spróbuj ponownie',
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
    tableColStreamer: 'Streamer',
    tableColMainGame: 'Główna gra',
    tableColNextStream: 'Następny stream',
    tableHeaders: {
      'Followers': 'Obserwujący',
      'Avg viewers': 'Śr. widzów',
      'Gained (7d)': 'Przyrost (7 dni)',
      'Growth': 'Wzrost',
      'Followers now': 'Obserwujący teraz',
      'Hours (28d)': 'Godziny (28 dni)',
      'Streams / week': 'Streamy / tydzień',
      'Avg duration': 'Śr. długość',
      'On-time rate': 'Punktualność',
      'Typical deviation': 'Typowe odchylenie',
      'Streams evaluated': 'Ocenione streamy',
    },
    trendNewLabel: 'nowy',
    trendNewTitle: 'Tydzień temu nie było go w tym rankingu',
    trendMoveTitle: (up, delta) => `${up ? 'W górę' : 'W dół'} o ${delta} od zeszłego tygodnia`,
    mainGameShareTitle: (pct) => `${pct}% skategoryzowanych streamów`,
    alwaysOnTitle: 'Kanał always-on — na żywo całą dobę',
  },
  recaps: {
    weeklyKicker: 'Podsumowanie tygodnia',
    monthlyKicker: 'Podsumowanie miesiąca',
    readMore: 'Przeczytaj całe podsumowanie',
    archiveTitle: 'Archiwum podsumowań',
    archiveIntro:
      'Wszystkie tygodniowe i miesięczne podsumowania rankingów: kto awansował, kto rósł najszybciej i które klipy oglądali wszyscy.',
    allRecaps: 'Wszystkie podsumowania',
    backToRankings: 'Wszystkie rankingi',
    previousEdition: 'Poprzednie wydanie',
    nextEdition: 'Następne wydanie',
    translationPending:
      'To wydanie nie zostało jeszcze przetłumaczone — wyświetlamy angielski oryginał.',
  },
  gamesExplorer: {
    sectionAria: 'Wszystkie gry i kategorie',
    sortAria: 'Sortowanie gier',
    sortLabels: { streamers: 'Najwięcej streamerów', hours: 'Najczęściej streamowane', trending: 'Na czasie' },
    viewTitles: {
      streamers: 'Najpopularniejsze gry na Twitchu i YouTube',
      hours: 'Najczęściej streamowane gry na Twitchu i YouTube',
      trending: 'Gry na czasie na Twitchu i YouTube',
    },
    searchPlaceholder: 'Szukaj gier…',
    searchAria: 'Szukaj gier',
    noMatch: 'Żadna gra nie pasuje do „{q}”.',
  },
  gameChips: {
    aria: (category) => `Statystyki ${category}`,
    streamersLabel: (n) =>
      pluralForms('pl', n, {
        one: 'streamer',
        few: 'streamerów',
        many: 'streamerów',
        other: 'streamera',
      }),
    liveNowLabel: 'teraz na żywo',
    watchingLabel: 'ogląda',
    streamedLabel: 'streamowania · 28 dni',
    streamsLabel: (n) =>
      pluralForms('pl', n, {
        one: 'stream · 28 dni',
        few: 'streamy · 28 dni',
        many: 'streamów · 28 dni',
        other: 'streama · 28 dni',
      }),
    peakLead: 'Szczyt: ',
    peakTail: ' widzów · 28 dni',
    trendTail: ' w tym tygodniu',
    trendTitle: 'Zmiana liczby aktywnych streamerów względem zeszłego tygodnia',
  },
  game: {
    notFoundTitle: 'Nie znaleziono gry — StreamerTimes',
    metaTitle: (category) => `Streamerzy ${category} — Na żywo, rankingi i harmonogram`,
    metaDescription: (category, names) => {
      const tail = `Kto jest teraz na żywo, nadchodzące streamy i harmonogramy przewidziane przez AI na Twitchu i YouTube.`;
      const namesLead =
        names.length > 0
          ? `${listConjunction(names, 'pl')} ${names.length === 1 ? 'prowadzi' : 'prowadzą'} w rankingu ${category}. `
          : '';
      const twoNamesLead =
        names.length > 1
          ? `${listConjunction(names.slice(0, 2), 'pl')} prowadzą w rankingu ${category}. `
          : '';
      return [
        `${namesLead}${tail}`,
        `${twoNamesLead}${tail}`,
        `Streamerzy ${category} z największą liczbą obserwujących. ${tail}`,
        tail,
      ];
    },
    ogTitle: (category) => `Streamerzy ${category} — na żywo, rankingi i harmonogram`,
    ogDescription: (category, names) => {
      const ogNames = names.length > 0 ? ` — ${listConjunction(names, 'pl')} —` : ':';
      return `Streamerzy ${category} z największą liczbą obserwujących${ogNames} status na żywo i harmonogram streamów na Twitchu i YouTube.`;
    },
    h1: (category) => `Streamerzy ${category} — na żywo i harmonogram`,
    intro: (shown, category, liveCount, upcomingCount, superlative) => {
      const lead = pluralForms('pl', shown, {
        one: `${shown} streamer ma w tym tygodniu streamy ${category} na żywo lub w planach na Twitchu i YouTube. `,
        few: `${shown} streamerów ma w tym tygodniu streamy ${category} na żywo lub w planach na Twitchu i YouTube. `,
        many: `${shown} streamerów ma w tym tygodniu streamy ${category} na żywo lub w planach na Twitchu i YouTube. `,
        other: `${shown} streamera ma w tym tygodniu streamy ${category} na żywo lub w planach na Twitchu i YouTube. `,
      });
      const live =
        liveCount > 0 ? `${liveCount} jest teraz na żywo` : 'Nikt nie jest teraz na żywo';
      const upcoming =
        upcomingCount > 0
          ? pluralForms('pl', upcomingCount, {
              one: `, a w ciągu 7 dni nadchodzi ${upcomingCount} stream.`,
              few: `, a w ciągu 7 dni nadchodzą ${upcomingCount} streamy.`,
              many: `, a w ciągu 7 dni nadchodzi ${upcomingCount} streamów.`,
              other: `, a w ciągu 7 dni nadchodzi ${upcomingCount} streama.`,
            })
          : '.';
      return lead + live + upcoming + superlative;
    },
    superlative: (category, name, value, isTwitch) =>
      ` Najwięcej ${isTwitch ? 'obserwujących' : 'subskrybentów'} ma tu ${name} — ${value}.`,
    onPageAria: 'Na tej stronie',
    navLiveNow: 'Na żywo',
    navTopStreamers: 'Top streamerzy',
    navBestTimes: 'Najlepsze pory',
    navSchedule: 'Harmonogram',
    navRelated: 'Podobne gry',
    followGame: (category) => `Obserwuj ${category}`,
    followingLabel: 'Obserwujesz',
    watchingNow: (category) => `Teraz na żywo: ${category}`,
    liveStreamsAria: (category) => `Streamy ${category} na żywo`,
    moreLiveAria: (category) => `Więcej streamów ${category} na żywo`,
    showMoreLive: (n) =>
      pluralForms('pl', n, {
        one: `Pokaż jeszcze ${n} kanał na żywo`,
        few: `Pokaż jeszcze ${n} kanały na żywo`,
        many: `Pokaż jeszcze ${n} kanałów na żywo`,
        other: `Pokaż jeszcze ${n} kanału na żywo`,
      }),
    moreLiveInRanking: (n, category) =>
      `Jeszcze ${n} na żywo w pełnym rankingu ${category} →`,
    liveUpdatesNote:
      'Status na żywo i liczby widzów aktualizują się co kilka minut.',
    mostFollowed: (category) =>
      `Streamerzy ${category} z największą liczbą obserwujących`,
    tableCaption: (category) =>
      `Streamerzy ${category} według liczby obserwujących, z następnym oczekiwanym streamem`,
    thRank: '#',
    thStreamer: 'Streamer',
    thNextStream: 'Następny stream',
    thFollowers: 'Obserwujący',
    thHours: 'Godziny / 28 dni',
    liveNowCell: 'Na żywo',
    seeFullRanking: (category) =>
      `Zobacz pełny ranking ${category} (top 50) →`,
    whoStreams: (category) => `Streamerzy, którzy streamują ${category}`,
    whenStreamed: (category) => `Kiedy streamuje się ${category}?`,
    heatmapSummary: (category) =>
      `Większość streamów ${category} leci {peak}{tz} — na podstawie ostatnich 4 tygodni śledzonych streamów.`,
    heatmapSummaryEmpty: 'Na podstawie ostatnich 4 tygodni śledzonych streamów.',
    tzLocalSuffix: ' (twój czas)',
    tzUtcSuffix: ' (UTC)',
    heatmapAria: (category) => `Tygodniowa mapa cieplna streamów ${category}.`,
    heatmapAriaWithPeak: (category) =>
      `Tygodniowa mapa cieplna streamów ${category}. Najbardziej aktywne okno: {peak}.`,
    heatmapTooltip: '{day} {from}–{to} · {amount} streamowania w 4 tygodnie',
    legendLess: 'Mniej',
    legendMore: 'Więcej',
    heatmapDayNames: [
      'w poniedziałki',
      'we wtorki',
      'w środy',
      'w czwartki',
      'w piątki',
      'w soboty',
      'w niedziele',
    ],
    bestTimeToStream: (category) => `Najlepsza pora na streamowanie ${category}`,
    trendingBadge: '▲ Na topie',
    bestTimeIntro: (category) =>
      `Dla streamerów: okna, w których ${category} ma najwięcej widzów na jeden kanał na żywo.`,
    fullHeatmapLink: 'Pełna mapa okazji i analiza →',
    bestSlotsAria: 'Najlepsze okna czasowe',
    viewersPerChannel: '~{score} widzów/kanał',
    timesLocalNote: 'Czasy w twojej strefie czasowej.',
    timesUtcNote: 'Czasy w UTC.',
    quietTitle: (category) => `Teraz nie ma streamów ${category}`,
    quietBody: (category) =>
      `Żaden ze śledzonych przez nas streamerów ${category} nie jest na żywo ani nie jest oczekiwany w ciągu 7 dni. Harmonogramy i prognozy AI aktualizują się kilka razy dziennie — wpadnij niedługo.`,
    quietMeanwhile: 'W międzyczasie',
    seeWhosLive: 'Zobacz, kto jest teraz na żywo →',
    browseAllGames: 'Przeglądaj wszystkie gry',
    gameStreamersChip: (category) => `Streamerzy ${category}`,
    scheduleAria: (category) => `Harmonogram streamów ${category}`,
    upcomingStreams: (category) => `Nadchodzące streamy ${category}`,
    scheduleNote:
      'Czasy dopasowują się do twojej strefy czasowej, obok jest czas streamera. Dni idą według kalendarza UTC, więc nocny stream może pojawić się pod następnym dniem.',
    filterAria: 'Filtruj harmonogram',
    allPlatforms: 'Wszystkie platformy',
    hideLowConfidence: 'Ukryj niskie prawdopodobieństwo',
    moreLowConfidence: (n) =>
      pluralForms('pl', n, {
        one: `Jeszcze ${n} prognoza z niskim prawdopodobieństwem`,
        few: `Jeszcze ${n} prognozy z niskim prawdopodobieństwem`,
        many: `Jeszcze ${n} prognoz z niskim prawdopodobieństwem`,
        other: `Jeszcze ${n} prognozy z niskim prawdopodobieństwem`,
      }),
    lowConfAria: (label) => `Prognozy z niskim prawdopodobieństwem: ${label}`,
    hiddenNotShown: (n) =>
      pluralForms('pl', n, {
        one: `Jeszcze ${n} prognoza na ten dzień nie jest pokazana. Pełny harmonogram znajdziesz na stronie streamera.`,
        few: `Jeszcze ${n} prognozy na ten dzień nie są pokazane. Pełny harmonogram znajdziesz na stronie streamera.`,
        many: `Jeszcze ${n} prognoz na ten dzień nie jest pokazanych. Pełny harmonogram znajdziesz na stronie streamera.`,
        other: `Jeszcze ${n} prognozy na ten dzień nie jest pokazane. Pełny harmonogram znajdziesz na stronie streamera.`,
      }),
    relatedGames: 'Podobne gry',
    relatedGamesAria: 'Podobne gry',
    relatedNote:
      'Gry, których składy streamerów pokrywały się w ostatnich 28 dniach.',
    allGamesFooter: '← Wszystkie gry i kategorie',
  },
  gameRanking: {
    notFoundTitle: 'Nie znaleziono — StreamerTimes',
    metaTitle: (category, page) =>
      page === 1
        ? `Top streamerzy ${category} — według obserwujących`
        : `Top streamerzy ${category} — według obserwujących — strona ${page}`,
    metaLeadIn: (name, value) => `${name} prowadzi z ${value} obserwujących. `,
    metaDescription: (category, leadIn) => [
      `${leadIn}Najlepsi streamerzy ${category} na Twitchu i YouTube według obserwujących, ze statusem na żywo i następnymi streamami. Aktualizowane codziennie.`,
      `${leadIn}Najlepsi streamerzy ${category} według obserwujących, ze statusem na żywo i następnymi streamami.`,
      `Najlepsi streamerzy ${category} na Twitchu i YouTube według obserwujących, ze statusem na żywo i następnymi streamami. Aktualizowane codziennie.`,
    ],
    ogTitle: (category) => `Top streamerzy ${category} — według obserwujących`,
    h1: (category) => `Top streamerzy ${category} według obserwujących`,
    introPage1: (count, category) =>
      `Top ${count} streamerów ${category}, których śledzimy, według obserwujących i subskrybentów kanału.`,
    topsTheList: (name, value, isTwitch) =>
      ` Listę otwiera ${name} z ${value} ${isTwitch ? 'obserwujących' : 'subskrybentów'}.`,
    introPageN: (from, to, total, category) =>
      `Miejsca ${from}–${to} z ${total} streamerów ${category}, których śledzimy, według obserwujących i subskrybentów kanału.`,
    methodology: (category) =>
      `Streamerzy aktywni w ${category} w ostatnich 28 dniach, według obserwujących. Liczby są odświeżane regularnie i mogą być opóźnione względem platform.`,
    followersRefreshed: (label) => ` Obserwujący zaktualizowani: ${label}.`,
    warmingUp:
      'Ten ranking dopiero się rozgrzewa — potrzebujemy trochę więcej danych, zanim będzie coś znaczył. Wpadnij niedługo.',
    missingDataNote:
      '— oznacza, że nie zebraliśmy jeszcze wystarczających danych o tym kanale, na przykład próbek widzów dla świeżo dodanych kanałów.',
    sortAria: 'Sortuj ranking',
    sortFollowers: 'Najwięcej obserwujących',
    sortHours: 'Najwięcej godzin (28 dni)',
    sortViewers: 'Najczęściej oglądani',
    filterLangAria: 'Filtruj według języka',
    allChip: 'Wszyscy',
    noMatch: 'Żaden streamer nie pasuje do tego filtra.',
    tableCaption: (category) =>
      `Streamerzy ${category} według liczby obserwujących`,
    thRank: '#',
    thStreamer: 'Streamer',
    thFollowers: 'Obserwujący',
    thAvgViewers: 'Śr. widzowie',
    thHours: 'Godziny (28 dni)',
    thShare: 'Udział gry',
    thShareTitle: (category) =>
      `Udział ${category} w ostatnich streamach streamera`,
    thNextStream: 'Następny stream',
    liveNowCell: 'Na żywo',
    watchingTail: ' · {value} ogląda',
    trendNewBadge: 'nowy',
    trendNewTitle: 'Tydzień temu nie było go w tym rankingu',
    trendUpTemplate: 'O {n} wyżej niż tydzień temu',
    trendDownTemplate: 'O {n} niżej niż tydzień temu',
    mainGameTemplate: 'Główna gra: {share}% ostatnich streamów',
    aboutRanking: 'O tym rankingu',
    faqMostFollowedQ: (category) =>
      `Który streamer ${category} ma najwięcej obserwujących?`,
    faqMostFollowedA: (category, top, second) => {
      const runnerUp = second ? `, przed ${second.name} z ${second.value}` : '';
      return `${top.name} ma obecnie najwięcej ${top.isTwitch ? 'obserwujących' : 'subskrybentów'} wśród streamerów ${category}, których śledzimy — ${top.value}${runnerUp}. Liczby są aktualizowane codziennie.`;
    },
    faqHowManyQ: (category) => `Ilu streamerów streamuje ${category}?`,
    faqHowManyA: (category, count, activity) => {
      const tail = activity
        ? ` Razem wystreamowali około ${activity.hours} godzin ${category} w ${activity.streams} streamach w ostatnich 28 dniach.`
        : '';
      const lead = pluralForms('pl', count, {
        one: `Obecnie śledzimy ${count} streamera, który niedawno streamował ${category} albo ma go w harmonogramie.`,
        few: `Obecnie śledzimy ${count} streamerów, którzy niedawno streamowali ${category} albo mają go w harmonogramie.`,
        many: `Obecnie śledzimy ${count} streamerów, którzy niedawno streamowali ${category} albo mają go w harmonogramie.`,
        other: `Obecnie śledzimy ${count} streamera, którzy niedawno streamowali ${category} albo mają go w harmonogramie.`,
      });
      return `${lead}${tail}`;
    },
    faqMeasuredQ: 'Jak mierzony jest ten ranking?',
    faqMeasuredA: (category) =>
      `Streamerzy aktywni w ${category} w ostatnich 28 dniach, według liczby obserwujących głównego kanału — obserwujący na Twitchu lub subskrybenci na YouTube. Kolumny godzin i udziału pochodzą z nocnego agregatu zakończonych streamów ${category}.`,
    faqShareQ: 'Co oznacza „Udział gry”?',
    faqShareA: (category) =>
      `Udział ${category} w ostatnich streamach streamera. 100% oznacza, że to obecnie jego jedyna gra; niski udział to znak okazjonalnego gościa w kategorii.`,
    relatedRankings: 'Podobne rankingi',
    relatedRankingsAria: 'Rankingi podobnych gier',
    liveAndSchedule: (category) => `Na żywo i harmonogram ${category} →`,
    allRankings: 'Wszystkie rankingi',
    paginationAria: (category) => `Strony rankingu ${category}`,
    prev: '← Poprzednia',
    next: 'Następna →',
  },
};
