import { formatCompactNumber } from '@/lib/format/number';
import { listConjunction, pluralForms } from '@/lib/i18n-core';
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

/** "від 3 стримерів" — genitive after "від" (quick fact: category of the week). */
const fromNStreamers = (n: number): string =>
  pluralForms('uk', n, {
    one: `${n} стримера`,
    other: `${n} стримерів`,
  });

/** "після 16 днів" — genitive after "після" (quick fact: comeback of the week). */
const afterNDays = (n: number): string =>
  pluralForms('uk', n, {
    one: `${n} дня`,
    other: `${n} днів`,
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
    tonight: 'Сьогодні ввечері',
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
    qrTitle: 'Відскануйте, щоб завантажити Streamer Times',
    qrHeading: 'Завантажити за QR-кодом',
    qrHint: 'Наведіть камеру телефона сюди',
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
    upNextTonightLink: 'Весь вечір →',
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
    clipsFilterMatches: (count) => `Кліпів: ${count}`,
    clipsFilterEmpty: 'Немає кліпів за цими фільтрами.',
    quickFactsTitle: 'Коротко про головне',
    quickFactsSub: 'Цифри зі стримів, які ми відстежуємо',
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
    factMarathonLabel: 'Марафон тижня',
    factMarathon: (name) => `Стільки ${name} був у ефірі без перерви.`,
    factComebackLabel: 'Повернення тижня',
    factComeback: (name, days) =>
      `${name} повернувся після ${afterNDays(days)} без стримів.`,
    factPrimeTimeLabel: 'Прайм-тайм',
    factPrimeTime: (total) =>
      `О цій годині стартує найбільше стримів — із ${total} трансляцій за 4 тижні.`,
    factBusiestDayLabel: 'Найзавантаженіший день',
    factBusiestDay: (total) =>
      `День тижня, коли стартує найбільше стримів — із ${total} трансляцій за 4 тижні.`,
    factLocalTimeNote: 'твій часовий пояс',
    factUtcNote: 'UTC',
    factTopCategoryLabel: 'Категорія тижня',
    factTopCategory: (category, streamers) =>
      `Стрими в ${category} за останні 7 днів, від ${fromNStreamers(streamers)}.`,
    factCompetitionLabel: 'Рівень конкуренції',
    factCompetition: (category) =>
      `Стільки відстежуваних каналів у середньому в ефірі в ${category} одночасно — найзавантаженіша категорія в нас.`,
    factRoomLabel: 'Вільна ніша',
    factRoom: (category, channels) =>
      `Глядачів на канал у ${category} — за лише ${channels} відстежуваних каналів у ефірі одночасно.`,
    factRoomSlotLabel: 'Найкращий час',
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
        'Підписуйся на улюблених стримерів',
        'Дивись, хто і коли вийде в ефір',
        'Статистика, кліпи і не тільки!',
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
      'Що дивиться весь Twitch просто зараз.',
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
  tonight: {
    h1: 'Хто стрімить сьогодні ввечері?',
    h1Night: 'Хто стрімить цієї ночі',
    intro: (total, names) =>
      `Сьогодні ввечері на Twitch і YouTube заплановано ${nStreams(total)}` +
      (names ? `, зокрема від ${names}` : '') +
      '.',
    introEmpty:
      'На сьогоднішній вечір поки нічого не заплановано. Прогнози з’являються протягом дня, коли стримери завершують поточні трансляції.',
    timesInZone: (zone) => `Час указано в ${zone}`,
    timesLocal: 'Час указано у вашому часовому поясі',
    error: 'Програма на сьогоднішній вечір тимчасово недоступна. Спробуйте ще раз за хвилину.',
    jumpAria: 'Перейти до потрібного часу вечора',
    liveNowHeading: 'Уже в ефірі',
    liveNowLink: 'Переглянути всіх, хто зараз в ефірі',
    primetimeHeading: 'Головне сьогодні ввечері',
    primetimeSub: (time) => `Найбільші імена, які вийдуть в ефір близько ${time}.`,
    blockFrom: (time) => `З ${time}`,
    blockNight: 'Пізня ніч',
    blockCount: (n) => nStreams(n),
    quietBody:
      'Загляньте пізніше або подивіться, хто в ефірі просто зараз, — вечір зазвичай наповнюється після 18:00.',
    aboutHeading: 'Про вечірній гід',
    aboutBody:
      'Ця сторінка — вечірній вигляд Streamer Times: усі трансляції на Twitch і YouTube, які ми очікуємо з 18:00 до 6:00, згруповані за часом початку, щоб ви могли спланувати вечір так само, як за телепрограмою.',
    faqWhatQ: 'Що йде сьогодні ввечері?',
    faqWhatA:
      'У блоках вище перелічені всі трансляції, заплановані або спрогнозовані на цей вечір, починаючи з найраніших. Анонсовані трансляції беруться прямо з розкладу стримера; решта спрогнозована за історією його ефірів, і на кожній картці є позначка впевненості.',
    faqHowQ: 'Звідки ви знаєте, коли хтось вийде в ефір?',
    faqHowA:
      'Ми відстежуємо історію трансляцій кожного каналу та його анонси, а потім прогнозуємо наступний старт. Висока впевненість означає стійкий регулярний графік або оголошену дату; низька — що розклад останнім часом був нерегулярним.',
    faqTimesQ: 'У якому часовому поясі вказано час?',
    faqTimesA: (zone) =>
      `Час указано в ${zone} і перемкнеться на ваш часовий пояс, щойно сторінка завантажиться. Вечір триває з 18:00 до 6:00, тож трансляція, що почалася після опівночі, все ще належить до сьогоднішнього вечора.`,
    itemListName: 'Трансляції сьогодні ввечері на Twitch і YouTube',
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
    dataRefreshed: (label) => ` Дані оновлено ${label}`,
    statStreamersTracked: 'стримерів відстежуємо',
    statLiveNow: 'зараз в ефірі',
    statGamesCategories: 'ігор і категорій',
    seeFullRanking: 'Дивитися повний рейтинг →',
    warmingUp: 'Рейтинги ще розігріваються — загляньте згодом.',
    filterEmpty: 'У цьому рейтингу немає стримерів за цими фільтрами.',
    filterError: 'Не вдалося завантажити відфільтрований рейтинг.',
    filterRetry: 'Спробувати ще раз',
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
    tableColStreamer: 'Стример',
    tableColMainGame: 'Основна гра',
    tableColNextStream: 'Наступний стрім',
    tableHeaders: {
      'Followers': 'Фоловери',
      'Avg viewers': 'Сер. глядачів',
      'Gained (7d)': 'Приріст (7 дн)',
      'Growth': 'Зростання',
      'Followers now': 'Фоловерів зараз',
      'Hours (28d)': 'Години (28 дн)',
      'Streams / week': 'Стримів / тижд.',
      'Avg duration': 'Сер. тривалість',
      'On-time rate': 'Пунктуальність',
      'Typical deviation': 'Типове відхилення',
      'Streams evaluated': 'Оцінено стримів',
    },
    trendNewLabel: 'нов.',
    trendNewTitle: 'Тиждень тому не було в цьому рейтингу',
    trendMoveTitle: (up, delta) => `${up ? 'Плюс' : 'Мінус'} ${delta} за тиждень`,
    mainGameShareTitle: (pct) => `${pct}% категоризованих стримів`,
    alwaysOnTitle: 'Цілодобовий канал — в ефірі 24/7',
  },
  recaps: {
    weeklyKicker: 'Підсумки тижня',
    monthlyKicker: 'Підсумки місяця',
    readMore: 'Читати повний огляд',
    archiveTitle: 'Архів оглядів',
    archiveIntro:
      'Усі щотижневі та щомісячні огляди рейтингів: хто піднявся, хто зростав найшвидше і які кліпи дивилися всі.',
    allRecaps: 'Усі огляди',
    backToRankings: 'Усі рейтинги',
    previousEdition: 'Попередній випуск',
    nextEdition: 'Наступний випуск',
    translationPending:
      'Цей випуск ще не перекладено — показано англійський оригінал.',
  },
  gamesExplorer: {
    sectionAria: 'Усі ігри та категорії',
    sortAria: 'Сортування ігор',
    sortLabels: { streamers: 'За числом стримерів', hours: 'За годинами ефіру', trending: 'У тренді' },
    viewTitles: {
      streamers: 'Найпопулярніші ігри на Twitch і YouTube',
      hours: 'Найбільш трансльовані ігри на Twitch і YouTube',
      trending: 'Ігри в тренді на Twitch і YouTube',
    },
    searchPlaceholder: 'Пошук ігор…',
    searchAria: 'Пошук ігор',
    noMatch: 'Немає ігор за запитом «{q}».',
  },
  gameChips: {
    aria: (category) => `Статистика ${category}`,
    streamersLabel: (n) =>
      pluralForms('uk', n, {
        one: 'стример',
        few: 'стримери',
        many: 'стримерів',
        other: 'стримера',
      }),
    liveNowLabel: 'зараз в ефірі',
    watchingLabel: 'дивляться',
    streamedLabel: 'стрімів · 28 днів',
    streamsLabel: (n) =>
      pluralForms('uk', n, {
        one: 'стрім · 28 днів',
        few: 'стріми · 28 днів',
        many: 'стрімів · 28 днів',
        other: 'стріму · 28 днів',
      }),
    peakLead: 'Пік ',
    peakTail: ' глядачів · 28 днів',
    trendTail: ' за тиждень',
    trendTitle: 'Зміна кількості активних стримерів проти минулого тижня',
  },
  game: {
    notFoundTitle: 'Гру не знайдено — StreamerTimes',
    metaTitle: (category) => `Стримери ${category} — Зараз в ефірі, рейтинги та розклад`,
    metaDescription: (category, names) => {
      const tail = `Хто зараз в ефірі, найближчі стріми та розклади, передбачені ШІ, на Twitch і YouTube.`;
      const namesLead =
        names.length > 0
          ? `${listConjunction(names, 'uk')} ${names.length === 1 ? 'очолює' : 'очолюють'} рейтинг ${category}. `
          : '';
      const twoNamesLead =
        names.length > 1
          ? `${listConjunction(names.slice(0, 2), 'uk')} очолюють рейтинг ${category}. `
          : '';
      return [
        `${namesLead}${tail}`,
        `${twoNamesLead}${tail}`,
        `Стримери ${category} з найбільшою кількістю підписників. ${tail}`,
        tail,
      ];
    },
    ogTitle: (category) => `Стримери ${category} — зараз в ефірі, рейтинги та розклад`,
    ogDescription: (category, names) => {
      const ogNames = names.length > 0 ? ` — ${listConjunction(names, 'uk')} —` : ':';
      return `Стримери ${category} з найбільшою кількістю підписників${ogNames} статус ефіру та розклад стрімів на Twitch і YouTube.`;
    },
    h1: (category) => `Стримери ${category} — зараз в ефірі та розклад`,
    intro: (shown, category, liveCount, upcomingCount, superlative) => {
      const lead = pluralForms('uk', shown, {
        one: `${shown} стример має стріми з ${category} в ефірі або в розкладі цього тижня на Twitch і YouTube. `,
        few: `${shown} стримери мають стріми з ${category} в ефірі або в розкладі цього тижня на Twitch і YouTube. `,
        many: `${shown} стримерів мають стріми з ${category} в ефірі або в розкладі цього тижня на Twitch і YouTube. `,
        other: `${shown} стримера мають стріми з ${category} в ефірі або в розкладі цього тижня на Twitch і YouTube. `,
      });
      const live =
        liveCount > 0 ? `${liveCount} зараз в ефірі` : 'Зараз ніхто не в ефірі';
      const upcoming =
        upcomingCount > 0
          ? pluralForms('uk', upcomingCount, {
              one: `, попереду ${upcomingCount} стрім у найближчі 7 днів.`,
              few: `, попереду ${upcomingCount} стріми в найближчі 7 днів.`,
              many: `, попереду ${upcomingCount} стрімів у найближчі 7 днів.`,
              other: `, попереду ${upcomingCount} стріму в найближчі 7 днів.`,
            })
          : '.';
      return lead + live + upcoming + superlative;
    },
    superlative: (category, name, value, isTwitch) =>
      ` Найбільше ${isTwitch ? 'фоловерів' : 'підписників'} тут у ${name} — ${value}.`,
    onPageAria: 'На цій сторінці',
    navLiveNow: 'Зараз в ефірі',
    navTopStreamers: 'Топ стримерів',
    navBestTimes: 'Найкращий час',
    navSchedule: 'Розклад',
    navRelated: 'Схожі ігри',
    followGame: (category) => `Стежити за ${category}`,
    followingLabel: 'Ви стежите',
    watchingNow: (category) => `Зараз в ефірі: ${category}`,
    liveStreamsAria: (category) => `Стріми ${category} в ефірі`,
    moreLiveAria: (category) => `Ще стріми ${category} в ефірі`,
    showMoreLive: (n) =>
      pluralForms('uk', n, {
        one: `Показати ще ${n} канал в ефірі`,
        few: `Показати ще ${n} канали в ефірі`,
        many: `Показати ще ${n} каналів в ефірі`,
        other: `Показати ще ${n} каналу в ефірі`,
      }),
    moreLiveInRanking: (n, category) =>
      `Ще ${n} в ефірі в повному рейтингу ${category} →`,
    liveUpdatesNote:
      'Статус ефіру та кількість глядачів оновлюються кожні кілька хвилин.',
    mostFollowed: (category) =>
      `Стримери ${category} з найбільшою кількістю підписників`,
    tableCaption: (category) =>
      `Стримери ${category} за кількістю підписників, з їхнім наступним очікуваним стрімом`,
    thRank: '#',
    thStreamer: 'Стример',
    thNextStream: 'Наступний стрім',
    thFollowers: 'Підписники',
    thHours: 'Години / 28 днів',
    liveNowCell: 'Зараз в ефірі',
    seeFullRanking: (category) =>
      `Дивитися повний рейтинг ${category} (топ-50) →`,
    whoStreams: (category) => `Стримери, які стрімлять ${category}`,
    whenStreamed: (category) => `Коли стрімлять ${category}?`,
    heatmapSummary: (category) =>
      `Більшість стрімів із ${category} йде {peak}{tz} — за даними останніх 4 тижнів.`,
    heatmapSummaryEmpty: 'За даними останніх 4 тижнів відстежених стрімів.',
    tzLocalSuffix: ' (ваш час)',
    tzUtcSuffix: ' (UTC)',
    heatmapAria: (category) => `Тижнева теплова карта стрімів ${category}.`,
    heatmapAriaWithPeak: (category) =>
      `Тижнева теплова карта стрімів ${category}. Найактивніше вікно: {peak}.`,
    heatmapTooltip: '{day} {from}–{to} · {amount} стрімів за 4 тижні',
    legendLess: 'Менше',
    legendMore: 'Більше',
    heatmapDayNames: [
      'щопонеділка',
      'щовівторка',
      'щосереди',
      'щочетверга',
      'щоп’ятниці',
      'щосуботи',
      'щонеділі',
    ],
    bestTimeToStream: (category) => `Найкращий час для стрімів із ${category}`,
    trendingBadge: '▲ У тренді',
    bestTimeIntro: (category) =>
      `Для стримерів: вікна, коли в ${category} найбільше глядачів на один живий канал.`,
    fullHeatmapLink: 'Повна карта можливостей та аналіз →',
    bestSlotsAria: 'Найкращі часові вікна',
    viewersPerChannel: '~{score} глядачів/канал',
    timesLocalNote: 'Час у вашому часовому поясі.',
    timesUtcNote: 'Час в UTC.',
    quietTitle: (category) => `Зараз немає стрімів із ${category}`,
    quietBody: (category) =>
      `Ніхто зі стримерів ${category}, за якими ми стежимо, не в ефірі й не очікується в найближчі 7 днів. Розклади та прогнози ШІ оновлюються кілька разів на день — зазирніть згодом.`,
    quietMeanwhile: 'А поки що',
    seeWhosLive: 'Подивіться, хто зараз в ефірі →',
    browseAllGames: 'Усі ігри',
    gameStreamersChip: (category) => `Стримери ${category}`,
    scheduleAria: (category) => `Розклад стрімів ${category}`,
    upcomingStreams: (category) => `Найближчі стріми з ${category}`,
    scheduleNote:
      'Час підлаштовується під ваш часовий пояс, поруч — час стримера. Дні йдуть за календарем UTC, тому пізній нічний стрім може опинитися під наступним днем.',
    filterAria: 'Фільтр розкладу',
    allPlatforms: 'Усі платформи',
    hideLowConfidence: 'Сховати низьку ймовірність',
    moreLowConfidence: (n) =>
      pluralForms('uk', n, {
        one: `Ще ${n} прогноз із низькою ймовірністю`,
        few: `Ще ${n} прогнози з низькою ймовірністю`,
        many: `Ще ${n} прогнозів із низькою ймовірністю`,
        other: `Ще ${n} прогнозу з низькою ймовірністю`,
      }),
    lowConfAria: (label) => `Прогнози з низькою ймовірністю: ${label}`,
    hiddenNotShown: (n) =>
      pluralForms('uk', n, {
        one: `Ще ${n} прогноз на цей день не показано. Повний розклад — на сторінці стримера.`,
        few: `Ще ${n} прогнози на цей день не показано. Повний розклад — на сторінці стримера.`,
        many: `Ще ${n} прогнозів на цей день не показано. Повний розклад — на сторінці стримера.`,
        other: `Ще ${n} прогнозу на цей день не показано. Повний розклад — на сторінці стримера.`,
      }),
    relatedGames: 'Схожі ігри',
    relatedGamesAria: 'Схожі ігри',
    relatedNote:
      'Ігри, чиї склади стримерів перетинаються за останні 28 днів.',
    allGamesFooter: '← Усі ігри та категорії',
  },
  gameRanking: {
    notFoundTitle: 'Не знайдено — StreamerTimes',
    metaTitle: (category, page) =>
      page === 1
        ? `Топ стримерів ${category} — за підписниками`
        : `Топ стримерів ${category} — за підписниками — сторінка ${page}`,
    metaLeadIn: (name, value) => `${name} лідирує з ${value} підписників. `,
    metaDescription: (category, leadIn) => [
      `${leadIn}Найкращі стримери ${category} на Twitch і YouTube за кількістю підписників, зі статусом ефіру та наступними стрімами. Оновлюється щодня.`,
      `${leadIn}Найкращі стримери ${category} за підписниками, зі статусом ефіру та наступними стрімами.`,
      `Найкращі стримери ${category} на Twitch і YouTube за кількістю підписників, зі статусом ефіру та наступними стрімами. Оновлюється щодня.`,
    ],
    ogTitle: (category) => `Топ стримерів ${category} — за підписниками`,
    h1: (category) => `Топ стримерів ${category} за підписниками`,
    introPage1: (count, category) =>
      `Топ-${count} стримерів ${category}, за якими ми стежимо, за фоловерами та підписниками каналу.`,
    topsTheList: (name, value, isTwitch) =>
      ` Список очолює ${name} з ${value} ${isTwitch ? 'фоловерів' : 'підписників'}.`,
    introPageN: (from, to, total, category) =>
      `Місця ${from}–${to} із ${total} стримерів ${category}, за якими ми стежимо, за фоловерами та підписниками каналу.`,
    methodology: (category) =>
      `Стримери, активні в ${category} за останні 28 днів, за кількістю підписників. Цифри оновлюються регулярно й можуть відставати від платформ.`,
    followersRefreshed: (label) => ` Підписники оновлені: ${label}`,
    warmingUp:
      'Цей рейтинг ще розігрівається — нам потрібно трохи більше даних, щоб він щось означав. Зазирніть згодом.',
    missingDataNote:
      '— означає, що для цього каналу ще замало даних, наприклад замірів глядачів у щойно доданих каналів.',
    sortAria: 'Сортування рейтингу',
    sortFollowers: 'За підписниками',
    sortHours: 'За годинами (28 днів)',
    sortViewers: 'За глядачами',
    filterLangAria: 'Фільтр за мовою',
    allChip: 'Усі',
    noMatch: 'Жоден стример не підходить під цей фільтр.',
    tableCaption: (category) => `Стримери ${category} за кількістю підписників`,
    thRank: '#',
    thStreamer: 'Стример',
    thFollowers: 'Підписники',
    thAvgViewers: 'Сер. глядачі',
    thHours: 'Години (28 днів)',
    thShare: 'Частка гри',
    thShareTitle: (category) =>
      `Частка останніх стрімів стримера, присвячених ${category}`,
    thNextStream: 'Наступний стрім',
    liveNowCell: 'Зараз в ефірі',
    watchingTail: ' · {value} дивляться',
    trendNewBadge: 'нов.',
    trendNewTitle: 'Тиждень тому не входив до цього рейтингу',
    trendUpTemplate: 'На {n} вище, ніж тиждень тому',
    trendDownTemplate: 'На {n} нижче, ніж тиждень тому',
    mainGameTemplate: 'Основна гра: {share}% останніх стрімів',
    aboutRanking: 'Про цей рейтинг',
    faqMostFollowedQ: (category) =>
      `У якого стримера ${category} найбільше підписників?`,
    faqMostFollowedA: (category, top, second) => {
      const runnerUp = second ? `, попереду ${second.name} з ${second.value}` : '';
      return `${top.name} зараз має найбільше ${top.isTwitch ? 'фоловерів' : 'підписників'} серед стримерів ${category}, за якими ми стежимо, — ${top.value}${runnerUp}. Цифри оновлюються щодня.`;
    },
    faqHowManyQ: (category) => `Скільки стримерів стрімлять ${category}?`,
    faqHowManyA: (category, count, activity) => {
      const tail = activity
        ? ` Разом вони настрімили близько ${activity.hours} годин ${category} за ${activity.streams} стрімів за останні 28 днів.`
        : '';
      const lead = pluralForms('uk', count, {
        one: `Зараз ми стежимо за ${count} стримером, який нещодавно стрімив ${category} або має його в розкладі.`,
        few: `Зараз ми стежимо за ${count} стримерами, які нещодавно стрімили ${category} або мають його в розкладі.`,
        many: `Зараз ми стежимо за ${count} стримерами, які нещодавно стрімили ${category} або мають його в розкладі.`,
        other: `Зараз ми стежимо за ${count} стримерами, які нещодавно стрімили ${category} або мають його в розкладі.`,
      });
      return `${lead}${tail}`;
    },
    faqMeasuredQ: 'Як вимірюється цей рейтинг?',
    faqMeasuredA: (category) =>
      `Стримери, активні в ${category} за останні 28 днів, за кількістю підписників основного каналу — фоловери на Twitch або підписники на YouTube. Колонки годин і частки беруться з нічного агрегату завершених стрімів із ${category}.`,
    faqShareQ: 'Що означає «Частка гри»?',
    faqShareA: (category) =>
      `Частка останніх стрімів стримера, присвячених ${category}. 100 % означає, що зараз це його єдина гра; низька частка — ознака випадкового гостя категорії.`,
    relatedRankings: 'Схожі рейтинги',
    relatedRankingsAria: 'Рейтинги схожих ігор',
    liveAndSchedule: (category) => `Зараз в ефірі та розклад ${category} →`,
    allRankings: 'Усі рейтинги',
    paginationAria: (category) => `Сторінки рейтингу ${category}`,
    prev: '← Назад',
    next: 'Далі →',
  },
};
