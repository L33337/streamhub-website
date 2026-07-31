import { formatCompactNumber } from '@/lib/format/number';
import { pluralForms } from '@/lib/i18n-core';
import type { HubLex } from './types';

/** "3 стримери" / "5 стримерів" — nominative counted noun. */
const nStreamers = (n: number): string =>
  pluralForms('uk', n, {
    one: `${n} стример`,
    few: `${n} стримери`,
    many: `${n} стримерів`,
    other: `${n} стримери`,
  });

/** "20 трансляцій" — counted broadcasts for the Streamer Wiki stats line. */
const nStreams = (n: number): string =>
  pluralForms('uk', n, {
    one: `${n} трансляція`,
    few: `${n} трансляції`,
    many: `${n} трансляцій`,
    other: `${n} трансляції`,
  });

/** "у 2 іграх" — locative counted games. */
const inGames = (n: number): string =>
  pluralForms('uk', n, {
    one: `в ${n} грі`,
    other: `у ${n} іграх`,
  });

/** "у 3 категоріях" — locative counted categories. */
const inCategories = (n: number): string =>
  pluralForms('uk', n, {
    one: `в ${n} категорії`,
    other: `у ${n} категоріях`,
  });

export const uk: HubLex = {
  crumbs: {
    aria: 'Навігаційний ланцюжок',
    home: 'Головна',
    liveNow: 'Зараз в ефірі',
    games: 'Ігри',
    streamers: 'Стримери',
    rankings: 'Рейтинги',
    pageN: (n) => `Сторінка ${n}`,
  },
  common: {
    browseStreamersAZ: 'Усі стримери від A до Z',
    allGamesCategories: 'Усі ігри та категорії',
  },
  home: {
    browseAllGames: 'Переглянути всі ігри та категорії →',
    seeLiveNow: 'Подивитися, хто зараз в ефірі →',
  },
  homeFeed: {
    // Іменний стиль (двокрапка) замість відмінювання числівників.
    ticker: (liveCount, soonCount, soonHours) => {
      const live = liveCount > 0 ? `Зараз в ефірі: ${liveCount}` : '';
      const soon =
        soonCount > 0 ? `почнуть протягом ${soonHours} год: ${soonCount}` : '';
      return live && soon ? `${live} · ${soon}` : live || soon;
    },
    liveTitle: 'Найбільш переглядувані зараз',
    liveFilterCategory: 'Категорія',
    liveFilterLanguage: 'Мова',
    liveFilterAllCategories: 'Усі категорії',
    liveFilterAllLanguages: 'Усі мови',
    liveFilterOption: (label, count) => `${label} (${count})`,
    liveFilterMatches: (count) => `Трансляцій: ${count}`,
    liveFilterReset: 'Скинути',
    liveFilterEmpty: 'Зараз немає трансляцій за цими фільтрами.',
    liveFilterNote: (top, total) =>
      `Топ-${top} за кількістю глядачів — фільтри шукають серед усіх трансляцій (${total})`,
    upNextTitle: 'Програма на сьогодні',
    upNextLink: 'В ефірі та незабаром →',
    lineupFilterTime: 'Час',
    lineupFilterAllTimes: 'Будь-який час',
    lineupFilterFrom: (time) => `З ${time}`,
    lineupFilterMatches: (count) => `Трансляцій: ${count}`,
    lineupFilterEmpty: 'Жодна трансляція не відповідає цим фільтрам.',
    chipAll: 'Усі',
    chipFavorites: 'Мої улюблені',
    lineupShowAll: (n) => `Показати всі стрими (${n})`,
    lineupShowMore: (n) => `Показати ще (${n})`,
    lineupShowLess: 'Згорнути',
    bellAria: (name) => `Отримати сповіщення, коли ${name} виходить в ефір`,
    upsell: {
      bellTitle: 'Не пропускай жодного стриму',
      bellBody:
        'Отримуй пуш-сповіщення просто перед початком стриму — у безкоштовному застосунку Streamer Times.',
      favoritesTitle: 'Твої улюблені — в один дотик',
      favoritesBody:
        'Підпишись на стримерів і відфільтруй цю сторінку до власної програми — безкоштовно, у застосунку або просто тут, у браузері.',
      appCta: 'Завантажити застосунок',
      loginCta: 'Увійти безкоштовно',
      close: 'Може, пізніше',
    },
    interrupt: {
      title: 'Ця сторінка — лише з твоїми стримерами.',
      body: 'Підпишись на своїх стримерів, і гід стане твоєю персональною стрічкою: твоя програма, пуш-сповіщення перед виходом в ефір та їхні найкращі моменти тижня.',
      note: 'Займе 30 секунд · безкоштовно',
      appCta: 'Завантажити застосунок',
      loginCta: 'Увійти через браузер',
    },
    clipsTitle: 'Кліпи тижня',
    quickFactsTitle: 'Коротко про головне',
    quickFactsSub: 'За стримами останніх 7 днів',
    factPredictionLabel: 'Перевірка прогнозів',
    factPrediction: (hits, total) =>
      `У ${hits} із ${total} прогнозів із високою ймовірністю стрим почався в межах двох годин від передбаченого часу.`,
    factPeakLabel: 'Пік тижня',
    factPeak: (name) =>
      `${name} зібрав найбільше одночасних глядачів цього тижня.`,
    factReliableLabel: 'Хвилина в хвилину',
    factReliable: (name, hits, total) =>
      `${name} вчасно розпочав ${hits} з ${total} останніх анонсованих стримів.`,
    factPauseLabel: 'На паузі',
    factPause: (name) => `${name} на паузі до цієї дати.`,
    risersTitle: 'Злети тижня',
    risersLink: 'Усі рейтинги →',
    risersGained: (delta) => `${delta} підписників за 7 днів`,
    mostStreamedTitle: 'Найбільше стримили цього тижня',
    weekHours: (value) => `${value} год в ефірі · 7 днів`,
    weekStreams: (n) => `стримів: ${n}`,
    mostWatchedTitle: 'Найбільш переглядувані',
    topStreamersCol: 'Топ-5 стримерів',
    topCategoriesCol: 'Топ-5 категорій',
    medianViewers: (value) => `${value} глядачів (медіана)`,
    hoursStreamed: (value) => `${value} год в ефірі · 28 днів`,
    followers: (value) => `${value} підписників`,
    missingStreamer: 'Немає твого стримера? Знайди та додай →',
    endcap: {
      title: 'Візьми свою програму з собою.',
      bullets: [
        'Пуш-сповіщення, щойно твої стримери виходять в ефір',
        'Віджет наступних стримів на головному екрані',
        'Улюблені синхронізовані — телефон і веб',
      ],
      webLead: 'Зручніше у браузері?',
      webLink: 'Створи безкоштовний акаунт',
      webTail: '— твоя стрічка вже чекає.',
    },
    sessionBanner: {
      text: 'З поверненням — твоя персональна стрічка готова.',
      cta: 'До моєї стрічки →',
    },
    sectionNav: {
      aria: 'Перейти до розділу',
      live: 'В ефірі',
      lineup: 'Сьогодні',
      trending: 'У тренді',
      clips: 'Кліпи',
      stats: 'Цифри',
      discover: 'Стримери',
    },
  },
  hero: {
    claim: 'Розклад. Кліпи. Статистика. Усе в одному місці.',
    ctaLogin: 'Увійдіть',
    ctaMid: ' або ',
    ctaApp: 'установіть застосунок',
    ctaTail: ', щоб стежити за улюбленими стрімерами.',
    ctaAppOnlyLink: 'Установіть застосунок',
    ctaAppOnlyTail: ', щоб стежити за улюбленими стрімерами.',
    kicker: 'Гід по live-стрімах',
    badgeNew: 'Новинка',
    badgeLive: 'Уже доступно для iOS та Android',
    titleLead: 'Розклад стрімів на ',
    titleTail: '',
    subtitle: 'Телегід для стримерів.',
    bodyLead:
      'Одна стрічка для Twitch і YouTube. Live-статус у реальному часі, ШІ-прогнози наступних стрімів і нуль зайвого шуму. Безкоштовно, без акаунта —',
    bodyLink: 'завантажте застосунок',
    bodyTail: 'для сповіщень про стріми.',
    appStoreSub: 'Завантажте в',
    playSub: 'ДОСТУПНО В',
    phoneAlt: 'Стримерка переглядає сьогоднішню програму на телефоні',
    phoneCaption: 'Переглядаємо сьогоднішню програму',
    statBothLabel: 'Дві платформи — один гід',
    statFavoritesValue: 'Ваші улюблені',
    statFavoritesLabel: 'Додавайте будь-який канал за секунди',
    statApiValue: 'Публічний API',
    statApiLabel: 'Незабаром · запишіться в лист очікування',
  },
  upcoming: {
    heading: 'Далі в програмі',
    aria: 'Майбутні стріми',
    empty: 'Зараз нічого не заплановано — загляньте згодом.',
  },
  trending: {
    heading: 'У тренді на Twitch',
    subtitle:
      'Найбільші ігри на Twitch просто зараз — наші стримери поки що покривають не всі з них.',
    aria: 'Ігри в тренді на Twitch',
    rankOnTwitch: (rank) => `#${rank} на Twitch`,
    sortAria: 'Сортувати ігри',
    sortTwitch: 'Twitch',
    sortHours: 'Години',
    sortViewers: 'Глядачі',
    sortStreamers: 'Стримери',
    liveViewers: (value) => `${value} дивляться зараз`,
    streamerCount: (value, count) =>
      pluralForms('uk', count, {
        one: `${value} стример`,
        few: `${value} стримери`,
        many: `${value} стримерів`,
        other: `${value} стримери`,
      }),
  },
  popular: {
    heading: 'Популярні стримери',
    viewAll: 'Усі стримери →',
  },
  streamerWiki: {
    heading: 'Streamer Wiki',
    subline: 'Хто вони, у що грають і коли виходять у ефір.',
    viewAll: 'Переглянути всіх стримерів →',
    followers: (value) => `≈${value} підписників`,
    streams28d: (count) => `${nStreams(count)} за 28 днів`,
    liveNow: 'Зараз у ефірі',
    nextPrefix: 'Наступна',
  },
  apiPromo: {
    heading: 'API для розробників',
    comingSoon: 'Незабаром',
    eyebrow: 'Для розробників',
    headlineLead: 'Будуйте на тих самих даних —',
    headlineKey: 'незабаром, через наш API.',
    body: 'Зараз ми підключаємо перших пілотних партнерів. Запишіться в лист очікування — ми напишемо, щойно відкриється публічний доступ, включно з безкоштовним тарифом для інді-розробників.',
    bullets: [
      'Live-статус і кількість глядачів у реальному часі',
      'ШІ-прогнози майбутніх стрімів із рівнем упевненості',
      'Вебхуки для подій «вийшов в ефір»',
      'Специфікація OpenAPI в комплекті',
    ],
    cta: 'У лист очікування',
  },
  live: {
    h1: 'Зараз в ефірі на Twitch і YouTube',
    intro: (liveCount, categoryCount, soonCount, soonHours = 6) =>
      `Просто зараз в ефірі ${nStreamers(liveCount)}` +
      (categoryCount > 0 ? ` ${inGames(categoryCount)} та категоріях` : '') +
      '.' +
      (soonCount > 0
        ? ` Ще ${soonCount} ${pluralForms('uk', soonCount, { one: 'має розпочати', other: 'мають розпочати' })} в найближчі ${soonHours} годин.`
        : ''),
    introEmpty: 'Зараз ніхто не стрімить — ось хто скоро почне.',
    error: 'Live-статус тимчасово недоступний. Спробуйте ще раз за хвилину.',
    otherCategory: 'Інше',
    categoryLiveAria: (name) => `${name} — зараз в ефірі`,
    nLive: (n) => `${n} в ефірі`,
    jumpToGame: 'Перейти до гри',
    startingSoon: 'Скоро почнуть',
    nextNHours: (n) => `найближчі ${n} годин`,
    emptyAll:
      'Зараз ніхто не в ефірі й ніхто не збирається починати. Загляньте в повний каталог стримерів або досліджуйте ігри, щоб знайти свій наступний стрім.',
    itemListName: 'Стримери, які зараз в ефірі на Twitch і YouTube',
  },
  streamers: {
    h1: 'Усі стримери Twitch і YouTube від A до Z',
    intro:
      'Усі стримери на Streamer Times — дивіться, хто зараз в ефірі та що вони стрімитимуть далі. Гортайте повний список сторінка за сторінкою.',
    pageOf: (page, totalPages) => `Сторінка ${page} з ${totalPages}.`,
    error: 'Стримери тимчасово недоступні. Спробуйте ще раз за хвилину.',
    paginationAria: 'Пагінація',
    prev: '← Назад',
    next: 'Далі →',
  },
  games: {
    liveRightNow: 'Зараз в ефірі',
    liveAria: 'Ігри з активними стрімами',
    error: 'Ігри тимчасово недоступні. Спробуйте ще раз за хвилину.',
    aboutHeading: 'Про ці ігри',
    updatedAt: (stamp) => `Оновлено о ${stamp}.`,
    relatedAria: `Пов'язані сторінки`,
  },
  gamesRoot: {
    h1: 'Найпопулярніші ігри на Twitch і YouTube',
    methodologyNote:
      'Відсортовані за кількістю стримерів, яких ми відстежуємо в кожній категорії за останні 28 днів.',
    intro: (gameCount, liveStreamerCount, liveGameCount) => {
      const lead = `Ми відстежуємо ${pluralForms('uk', gameCount, {
        one: `${gameCount} гру`,
        few: `${gameCount} ігри`,
        many: `${gameCount} ігор`,
        other: `${gameCount} ігри`,
      })} та категорії на Twitch і YouTube.`;
      const note =
        'Відсортовані за кількістю стримерів, яких ми відстежуємо в кожній категорії за останні 28 днів.';
      if (liveStreamerCount <= 0) return `${lead} ${note}`;
      const streamers = `Просто зараз в ефірі ${formatCompactNumber(liveStreamerCount, 'uk')} ${pluralForms(
        'uk',
        liveStreamerCount,
        {
          one: 'стример',
          few: 'стримери',
          many: 'стримерів',
          other: 'стримери',
        },
      )}`;
      const across = liveGameCount > 0 ? ` ${inCategories(liveGameCount)}` : '';
      return `${lead} ${streamers}${across}. ${note}`;
    },
    faqPopularQ: 'Яка гра найпопулярніша на Twitch і YouTube?',
    faqPopularA: (top, second) =>
      `${top.category} збирає найбільше стримерів, яких ми відстежуємо — ${pluralForms('uk', top.count, {
        one: `${top.count} канал стрімив її`,
        few: `${top.count} канали стрімили її`,
        many: `${top.count} каналів стрімили її`,
        other: `${top.count} канали стрімили її`,
      })} за останні 28 днів${second ? `, випереджаючи ${second.category} з ${second.count}` : ''}.`,
    faqWhoQ: 'Хто стрімить просто зараз?',
    faqWhoA: (liveStreamerCount, liveGameCount) =>
      `В ефірі ${nStreamers(liveStreamerCount)} ${inCategories(liveGameCount)}. Відкрийте будь-яку категорію, щоб побачити активні канали та їхні майбутні стріми.`,
    faqRankedQ: 'Як ранжуються ці ігри?',
    faqRankedA: (gameCount) =>
      `Відсортовані за кількістю стримерів, яких ми відстежуємо в кожній категорії за останні 28 днів. Цифри походять із нічної агрегації завершених трансляцій по ${pluralForms('uk', gameCount, {
        one: `${gameCount} грі`,
        other: `${gameCount} іграх`,
      })}; live-дані оновлюються що кілька хвилин.`,
    faqHoursQ: 'Чи означають «години стрімінгу» час перегляду?',
    faqHoursA:
      'Ні. Години стрімінгу показують, скільки часу стримери були в ефірі в категорії. Час перегляду глядачів ми не рахуємо; live-глядачі на картках — це поточна вибірка, а не сума.',
  },
  rankings: {
    h1: 'Рейтинги стримерів',
    intro: (n) =>
      `Хто найбільші, найшвидше зростаючі, найактивніші та найнадійніші стримери на Twitch і YouTube? ${n} ${pluralForms('uk', n, {
        one: 'рейтинг',
        few: 'рейтинги',
        many: 'рейтингів',
        other: 'рейтинги',
      })} по всіх стримерах, яких ми відстежуємо, — оновлюються щодня на основі реальних даних трансляцій.`,
    dataRefreshed: (label) => ` Дані оновлено ${label}.`,
    statStreamersTracked: 'стримерів відстежуємо',
    statLiveNow: 'зараз в ефірі',
    statGamesCategories: 'ігор і категорій',
    seeFullRanking: 'Дивитися повний рейтинг →',
    warmingUp: 'Рейтинги ще розігріваються — загляньте згодом.',
    byGameHeading: 'Рейтинги за іграми',
    byGameSubtitle: 'Стримери з найбільшою кількістю підписників у кожній грі та категорії.',
    byGameAria: 'Рейтинги популярних ігор',
    topGameStreamers: (category) => `Найкращі стримери ${category}`,
    whoIsLive: 'Хто зараз в ефірі?',
    climbersThisWeek: 'Найбільші злети тижня',
    metricH1: {
      'most-followed': 'Стримери з найбільшою кількістю підписників',
      'fastest-growing': 'Стримери, що зростають найшвидше',
      'most-watched': 'Найпереглядуваніші стримери',
      'most-active': 'Найактивніші стримери',
      'most-reliable': 'Найпунктуальніші стримери',
    },
    metricNote: {
      'most-followed':
        'Оновлюється щодня. Кількість підписників і фоловерів оновлюється регулярно й може відставати від живих цифр платформ.',
      'fastest-growing':
        'Приріст фоловерів каналу (Twitch) або підписників (YouTube) за останні 7 днів за щоденними знімками кожного відстежуваного каналу. До рейтингу потрапляють лише канали з позитивним зростанням. Оновлюється щодня.',
      'most-watched':
        'Медіана одночасних live-глядачів за останні 28 днів (щогодинна вибірка). Оновлюється щодня.',
      'most-active':
        'Сумарні години в ефірі за останні 28 днів. Кожен стрім рахується один раз; цілодобові 24/7-канали виключено. Оновлюється щодня.',
      'most-reliable':
        'Частка анонсованих на Twitch стрімів, які справді почалися в межах ±30 хвилин, за останніми 20 анонсованими стрімами за 90 днів (мінімум 10 оцінених). Оновлюється щодня.',
    },
  },
};
