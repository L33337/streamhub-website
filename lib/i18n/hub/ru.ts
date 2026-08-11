import { formatCompactNumber } from '@/lib/format/number';
import { listConjunction, pluralForms } from '@/lib/i18n-core';
import type { HubLex } from './types';

/** "3 стримера" / "5 стримеров" — nominative counted noun. */
const nStreamers = (n: number): string =>
  pluralForms('ru', n, {
    one: `${n} стример`,
    few: `${n} стримера`,
    many: `${n} стримеров`,
    other: `${n} стримера`,
  });

/** "20 трансляций" — counted broadcasts for the Streamer Wiki stats line. */
const nStreams = (n: number): string =>
  pluralForms('ru', n, {
    one: `${n} трансляция`,
    few: `${n} трансляции`,
    many: `${n} трансляций`,
    other: `${n} трансляции`,
  });

/** "от 3 стримеров" — genitive after "от" (quick fact: category of the week). */
const fromNStreamers = (n: number): string =>
  pluralForms('ru', n, {
    one: `${n} стримера`,
    other: `${n} стримеров`,
  });

/** "после 16 дней" — genitive after "после" (quick fact: comeback of the week). */
const afterNDays = (n: number): string =>
  pluralForms('ru', n, {
    one: `${n} дня`,
    other: `${n} дней`,
  });

/** "в 2 играх" — prepositional counted games. */
const inGames = (n: number): string =>
  pluralForms('ru', n, {
    one: `в ${n} игре`,
    other: `в ${n} играх`,
  });

/** "в 3 категориях" — prepositional counted categories. */
const inCategories = (n: number): string =>
  pluralForms('ru', n, {
    one: `в ${n} категории`,
    other: `в ${n} категориях`,
  });

export const ru: HubLex = {
  crumbs: {
    aria: 'Навигационная цепочка',
    home: 'Главная',
    liveNow: 'Сейчас в эфире',
    tonight: 'Сегодня вечером',
    games: 'Игры',
    streamers: 'Стримеры',
    rankings: 'Рейтинги',
    pageN: (n) => `Страница ${n}`,
  },
  common: {
    browseStreamersAZ: 'Все стримеры от A до Z',
    allGamesCategories: 'Все игры и категории',
  },
  home: {
    browseAllGames: 'Смотреть все игры и категории →',
    seeLiveNow: 'Посмотреть, кто сейчас в эфире →',
    qrTitle: 'Отсканируйте, чтобы скачать Streamer Times',
    qrHeading: 'Скачать по QR-коду',
    qrHint: 'Наведите камеру телефона сюда',
  },
  homeFeed: {
    // Именной стиль (двоеточие) вместо склонения числительных.
    ticker: (liveCount, soonCount, soonHours) => {
      const live = liveCount > 0 ? `В эфире сейчас: ${liveCount}` : '';
      const soon =
        soonCount > 0 ? `начнут в ближайшие ${soonHours} ч: ${soonCount}` : '';
      return live && soon ? `${live} · ${soon}` : live || soon;
    },
    liveTitle: 'Самые просматриваемые сейчас',
    liveFilterCategory: 'Категория',
    liveFilterLanguage: 'Язык',
    liveFilterAllCategories: 'Все категории',
    liveFilterAllLanguages: 'Все языки',
    liveFilterOption: (label, count) => `${label} (${count})`,
    liveFilterMatches: (count) => `Трансляций: ${count}`,
    liveFilterReset: 'Сбросить',
    liveFilterEmpty: 'Сейчас нет трансляций по этим фильтрам.',
    liveFilterNote: (top, total) =>
      `Топ-${top} по числу зрителей — фильтры ищут среди всех трансляций (${total})`,
    upNextTitle: 'Программа на сегодня',
    upNextLink: 'В эфире и скоро →',
    upNextTonightLink: 'Весь вечер →',
    lineupFilterTime: 'Время',
    lineupFilterAllTimes: 'Любое время',
    lineupFilterFrom: (time) => `С ${time}`,
    lineupFilterMatches: (count) => `Трансляций: ${count}`,
    lineupFilterEmpty: 'Ни одна трансляция не подходит под эти фильтры.',
    chipAll: 'Все',
    chipFavorites: 'Мои избранные',
    lineupShowAll: (n) => `Показать все стримы (${n})`,
    lineupShowMore: (n) => `Показать ещё (${n})`,
    lineupShowLess: 'Свернуть',
    bellAria: (name) => `Получать уведомление, когда ${name} выходит в эфир`,
    upsell: {
      bellTitle: 'Не пропускай ни одного стрима',
      bellBody:
        'Получай пуш-уведомление прямо перед началом стрима — в бесплатном приложении Streamer Times.',
      favoritesTitle: 'Твои избранные — в одно касание',
      favoritesBody:
        'Подпишись на стримеров и отфильтруй эту страницу до своей собственной программы — бесплатно, в приложении или прямо здесь, в браузере.',
      appCta: 'Скачать приложение',
      loginCta: 'Войти бесплатно',
      close: 'Может, позже',
    },
    interrupt: {
      title: 'Эта страница — только с твоими стримерами.',
      body: 'Подпишись на своих стримеров, и гид станет твоей персональной лентой: твоя программа, пуш-уведомления перед выходом в эфир и их лучшие моменты недели.',
      note: 'Займёт 30 секунд · бесплатно',
      appCta: 'Скачать приложение',
      loginCta: 'Войти через браузер',
    },
    clipsTitle: 'Клипы недели',
    clipsFilterMatches: (count) => `Клипов: ${count}`,
    clipsFilterEmpty: 'Нет клипов по этим фильтрам.',
    quickFactsTitle: 'Коротко о главном',
    quickFactsSub: 'Цифры из стримов, которые мы отслеживаем',
    factPredictionLabel: 'Проверка прогнозов',
    factPrediction: (hits, total) =>
      `В ${hits} из ${total} прогнозов с высокой вероятностью стрим начался в пределах двух часов от предсказанного времени.`,
    factPeakLabel: 'Пик недели',
    factPeak: (name) =>
      `${name} собрал больше всех одновременных зрителей на этой неделе.`,
    factReliableLabel: 'Минута в минуту',
    factReliable: (name, hits, total) =>
      `${name} вовремя начал ${hits} из ${total} последних анонсированных стримов.`,
    factPauseLabel: 'На паузе',
    factPause: (name) => `${name} на паузе до этой даты.`,
    factMarathonLabel: 'Марафон недели',
    factMarathon: (name) => `Столько ${name} был в эфире без перерыва.`,
    factComebackLabel: 'Возвращение недели',
    factComeback: (name, days) =>
      `${name} вернулся после ${afterNDays(days)} без стримов.`,
    factPrimeTimeLabel: 'Прайм-тайм',
    factPrimeTime: (total) =>
      `В этот час стартует больше всего стримов — из ${total} трансляций за 4 недели.`,
    factBusiestDayLabel: 'Самый загруженный день',
    factBusiestDay: (total) =>
      `День недели, когда стартует больше всего стримов — из ${total} трансляций за 4 недели.`,
    factLocalTimeNote: 'твой часовой пояс',
    factUtcNote: 'UTC',
    factTopCategoryLabel: 'Категория недели',
    factTopCategory: (category, streamers) =>
      `Стримы в ${category} за последние 7 дней, от ${fromNStreamers(streamers)}.`,
    factCompetitionLabel: 'Уровень конкуренции',
    factCompetition: (category) =>
      `Столько отслеживаемых каналов в среднем в эфире в ${category} одновременно — самая переполненная категория у нас.`,
    factRoomLabel: 'Свободная ниша',
    factRoom: (category, channels) =>
      `Зрителей на канал в ${category} — всего при ${channels} отслеживаемых каналах в эфире одновременно.`,
    factRoomSlotLabel: 'Лучшее время',
    risersTitle: 'Взлёты недели',
    risersLink: 'Все рейтинги →',
    risersGained: (delta) => `${delta} подписчиков за 7 дней`,
    mostStreamedTitle: 'Больше всего стримили на этой неделе',
    weekHours: (value) => `${value} ч в эфире · 7 дней`,
    weekStreams: (n) => `стримов: ${n}`,
    mostWatchedTitle: 'Самые просматриваемые',
    topStreamersCol: 'Топ-5 стримеров',
    topCategoriesCol: 'Топ-5 категорий',
    medianViewers: (value) => `${value} зрителей (медиана)`,
    hoursStreamed: (value) => `${value} ч в эфире · 28 дней`,
    followers: (value) => `${value} подписчиков`,
    missingStreamer: 'Нет твоего стримера? Найди и добавь →',
    endcap: {
      title: 'Возьми свою программу с собой.',
      bullets: [
        'Подписывайся на любимых стримеров',
        'Смотри, кто и когда выйдет в эфир',
        'Статистика, клипы и не только!',
      ],
      webLead: 'Удобнее в браузере?',
      webLink: 'Создай бесплатный аккаунт',
      webTail: '— твоя лента уже ждёт.',
    },
    sessionBanner: {
      text: 'С возвращением — твоя персональная лента готова.',
      cta: 'К моей ленте →',
    },
    sectionNav: {
      aria: 'Перейти к разделу',
      live: 'В эфире',
      lineup: 'Сегодня',
      trending: 'В тренде',
      clips: 'Клипы',
      stats: 'Цифры',
      discover: 'Стримеры',
    },
  },
  hero: {
    claim: 'Расписание. Клипы. Статистика. Всё в одном месте.',
    ctaLogin: 'Войдите',
    ctaMid: ' или ',
    ctaApp: 'скачайте приложение',
    ctaTail: ', чтобы следить за любимыми стримерами.',
    ctaAppOnlyLink: 'Скачайте приложение',
    ctaAppOnlyTail: ', чтобы следить за любимыми стримерами.',
    kicker: 'Гид по live-стримам',
    badgeNew: 'Новинка',
    badgeLive: 'Уже доступно для iOS и Android',
    titleLead: 'Расписание стримов на ',
    titleTail: '',
    subtitle: 'Телегид по стримерам.',
    bodyLead:
      'Одна лента для Twitch и YouTube. Live-статус в реальном времени, ИИ-прогнозы следующих стримов и ноль лишнего шума. Бесплатно и без аккаунта —',
    bodyLink: 'скачайте приложение',
    bodyTail: 'для уведомлений о стримах.',
    appStoreSub: 'Загрузите в',
    playSub: 'ДОСТУПНО В',
    phoneAlt: 'Стримерша листает сегодняшнюю программу на телефоне',
    phoneCaption: 'Смотрим сегодняшнюю программу',
    statBothLabel: 'Две платформы — один гид',
    statFavoritesValue: 'Ваши фавориты',
    statFavoritesLabel: 'Добавляйте любой канал за секунды',
    statApiValue: 'Публичный API',
    statApiLabel: 'Скоро · запишитесь в лист ожидания',
  },
  upcoming: {
    heading: 'Дальше в программе',
    aria: 'Предстоящие стримы',
    empty: 'Сейчас ничего не запланировано — загляните позже.',
  },
  trending: {
    heading: 'В тренде на Twitch',
    subtitle:
      'Что смотрит весь Twitch прямо сейчас.',
    aria: 'Игры в тренде на Twitch',
    rankOnTwitch: (rank) => `#${rank} на Twitch`,
    sortAria: 'Сортировать игры',
    sortTwitch: 'Twitch',
    sortHours: 'Часы',
    sortViewers: 'Зрители',
    sortStreamers: 'Стримеры',
    liveViewers: (value) => `${value} смотрят сейчас`,
    streamerCount: (value, count) =>
      pluralForms('ru', count, {
        one: `${value} стример`,
        few: `${value} стримера`,
        many: `${value} стримеров`,
        other: `${value} стримера`,
      }),
  },
  popular: {
    heading: 'Популярные стримеры',
    viewAll: 'Все стримеры →',
  },
  streamerWiki: {
    heading: 'Streamer Wiki',
    subline: 'Кто они, во что играют и когда выходят в эфир.',
    viewAll: 'Смотреть всех стримеров →',
    followers: (value) => `≈${value} подписчиков`,
    streams28d: (count) => `${nStreams(count)} за 28 дней`,
    liveNow: 'Сейчас в эфире',
    nextPrefix: 'Следующая',
  },
  apiPromo: {
    heading: 'API для разработчиков',
    comingSoon: 'Скоро',
    eyebrow: 'Для разработчиков',
    headlineLead: 'Стройте на тех же данных —',
    headlineKey: 'скоро, через наш API.',
    body: 'Сейчас мы подключаем первых пилотных партнёров. Запишитесь в лист ожидания — мы напишем, как только откроется публичный доступ, включая бесплатный тариф для инди-разработчиков.',
    bullets: [
      'Live-статус и число зрителей в реальном времени',
      'ИИ-прогнозы предстоящих стримов с уровнем уверенности',
      'Вебхуки для событий «вышел в эфир»',
      'Спецификация OpenAPI в комплекте',
    ],
    cta: 'В лист ожидания',
  },
  live: {
    h1: 'Сейчас в эфире на Twitch и YouTube',
    intro: (liveCount, categoryCount, soonCount, soonHours = 6) =>
      `Прямо сейчас в эфире ${nStreamers(liveCount)}` +
      (categoryCount > 0 ? ` ${inGames(categoryCount)} и категориях` : '') +
      '.' +
      (soonCount > 0
        ? ` Ещё ${soonCount} ${pluralForms('ru', soonCount, { one: 'должен начать', other: 'должны начать' })} в ближайшие ${soonHours} часов.`
        : ''),
    introEmpty: 'Сейчас никто не стримит — вот кто скоро начнёт.',
    error: 'Live-статус временно недоступен. Попробуйте ещё раз через минуту.',
    otherCategory: 'Другое',
    categoryLiveAria: (name) => `${name} — сейчас в эфире`,
    nLive: (n) => `${n} в эфире`,
    jumpToGame: 'Перейти к игре',
    startingSoon: 'Скоро начнут',
    nextNHours: (n) => `ближайшие ${n} часов`,
    emptyAll:
      'Сейчас никто не в эфире и никто не собирается начинать. Загляните в полный каталог стримеров или изучите игры, чтобы найти свой следующий стрим.',
    itemListName: 'Стримеры, которые сейчас в эфире на Twitch и YouTube',
  },
  tonight: {
    h1: 'Кто стримит сегодня вечером?',
    h1Night: 'Кто стримит этой ночью',
    intro: (total, names) =>
      `Сегодня вечером на Twitch и YouTube запланировано ${nStreams(total)}` +
      (names ? `, в том числе от ${names}` : '') +
      '.',
    introEmpty:
      'На сегодняшний вечер пока ничего не запланировано. Прогнозы появляются в течение дня, по мере того как стримеры завершают текущие трансляции.',
    timesInZone: (zone) => `Время указано в ${zone}`,
    timesLocal: 'Время указано в вашем часовом поясе',
    error: 'Программа на сегодняшний вечер временно недоступна. Попробуйте ещё раз через минуту.',
    jumpAria: 'Перейти к нужному времени вечера',
    liveNowHeading: 'Уже в эфире',
    liveNowLink: 'Посмотреть всех, кто сейчас в эфире',
    primetimeHeading: 'Главное сегодня вечером',
    primetimeSub: (time) => `Самые крупные имена, которые выйдут в эфир около ${time}.`,
    blockFrom: (time) => `С ${time}`,
    blockNight: 'Поздняя ночь',
    blockCount: (n) => nStreams(n),
    quietBody:
      'Загляните позже или посмотрите, кто в эфире прямо сейчас, — вечер обычно наполняется после 18:00.',
    aboutHeading: 'О вечернем гиде',
    aboutBody:
      'Эта страница — вечерний вид Streamer Times: все трансляции на Twitch и YouTube, которые мы ожидаем с 18:00 до 6:00, сгруппированные по времени начала, чтобы вы могли спланировать вечер так же, как по телепрограмме.',
    faqWhatQ: 'Что идёт сегодня вечером?',
    faqWhatA:
      'В блоках выше перечислены все трансляции, запланированные или спрогнозированные на этот вечер, начиная с самых ранних. Анонсированные трансляции берутся прямо из расписания стримера; остальные предсказаны по истории его эфиров, и на каждой карточке есть отметка уверенности.',
    faqHowQ: 'Откуда вы знаете, когда кто-то выйдет в эфир?',
    faqHowA:
      'Мы отслеживаем историю трансляций каждого канала и его анонсы, а затем прогнозируем следующий старт. Высокая уверенность означает устойчивый регулярный график или объявленную дату; низкая — что расписание в последнее время было нерегулярным.',
    faqTimesQ: 'В каком часовом поясе указано время?',
    faqTimesA: (zone) =>
      `Время указано в ${zone} и переключится на ваш часовой пояс, как только страница загрузится. Вечер длится с 18:00 до 6:00, поэтому трансляция, начавшаяся после полуночи, всё ещё относится к сегодняшнему вечеру.`,
    itemListName: 'Трансляции сегодня вечером на Twitch и YouTube',
  },
  streamers: {
    h1: 'Все стримеры Twitch и YouTube от A до Z',
    intro:
      'Все стримеры на Streamer Times — смотрите, кто сейчас в эфире и что они стримят дальше. Листайте полный список страница за страницей.',
    pageOf: (page, totalPages) => `Страница ${page} из ${totalPages}.`,
    error: 'Стримеры временно недоступны. Попробуйте ещё раз через минуту.',
    paginationAria: 'Пагинация',
    prev: '← Назад',
    next: 'Вперёд →',
  },
  games: {
    liveRightNow: 'Сейчас в эфире',
    liveAria: 'Игры с активными стримами',
    error: 'Игры временно недоступны. Попробуйте ещё раз через минуту.',
    aboutHeading: 'Об этих играх',
    updatedAt: (stamp) => `Обновлено в ${stamp}.`,
    relatedAria: 'Связанные страницы',
  },
  gamesRoot: {
    h1: 'Самые популярные игры на Twitch и YouTube',
    methodologyNote:
      'Отсортированы по числу стримеров, которых мы отслеживаем в каждой категории за последние 28 дней.',
    intro: (gameCount, liveStreamerCount, liveGameCount) => {
      const lead = `Мы отслеживаем ${pluralForms('ru', gameCount, {
        one: `${gameCount} игру`,
        few: `${gameCount} игры`,
        many: `${gameCount} игр`,
        other: `${gameCount} игры`,
      })} и категории на Twitch и YouTube.`;
      const note =
        'Отсортированы по числу стримеров, которых мы отслеживаем в каждой категории за последние 28 дней.';
      if (liveStreamerCount <= 0) return `${lead} ${note}`;
      const compactN = formatCompactNumber(liveStreamerCount, 'ru');
      const streamers = `Сейчас в эфире ${compactN} ${pluralForms('ru', liveStreamerCount, {
        one: 'стример',
        few: 'стримера',
        many: 'стримеров',
        other: 'стримера',
      })}`;
      const across = liveGameCount > 0 ? ` ${inCategories(liveGameCount)}` : '';
      return `${lead} ${streamers}${across}. ${note}`;
    },
    faqPopularQ: 'Какая игра самая популярная на Twitch и YouTube?',
    faqPopularA: (top, second) =>
      `${top.category} собирает больше всего отслеживаемых нами стримеров — ${pluralForms('ru', top.count, {
        one: `${top.count} канал стримил её`,
        few: `${top.count} канала стримили её`,
        many: `${top.count} каналов стримили её`,
        other: `${top.count} канала стримили её`,
      })} за последние 28 дней${second ? `, опережая ${second.category} с ${second.count}` : ''}.`,
    faqWhoQ: 'Кто стримит прямо сейчас?',
    faqWhoA: (liveStreamerCount, liveGameCount) =>
      `В эфире ${nStreamers(liveStreamerCount)} ${inCategories(liveGameCount)}. Откройте любую категорию, чтобы увидеть активные каналы и их предстоящие стримы.`,
    faqRankedQ: 'Как ранжируются эти игры?',
    faqRankedA: (gameCount) =>
      `Отсортированы по числу стримеров, которых мы отслеживаем в каждой категории за последние 28 дней. Цифры берутся из ночной агрегации завершённых трансляций по ${pluralForms('ru', gameCount, {
        one: `${gameCount} игре`,
        other: `${gameCount} играм`,
      })}; live-данные обновляются каждые несколько минут.`,
    faqHoursQ: 'Означают ли «часы стриминга» время просмотра?',
    faqHoursA:
      'Нет. Часы стриминга показывают, сколько времени стримеры были в эфире в категории. Время просмотра зрителей мы не считаем; live-зрители на карточках — это текущая выборка, а не сумма.',
  },
  rankings: {
    h1: 'Рейтинги стримеров Twitch и YouTube',
    intro: (n) =>
      `Кто самые крупные, самые быстрорастущие, самые активные и самые надёжные стримеры на Twitch и YouTube? ${n} ${pluralForms('ru', n, {
        one: 'рейтинг',
        few: 'рейтинга',
        many: 'рейтингов',
        other: 'рейтинга',
      })} со статистикой подписчиков, зрителей и активности по всем стримерам, которых мы отслеживаем, — обновляются ежедневно на основе реальных данных трансляций.`,
    dataRefreshed: (label) => ` Данные обновлены ${label}`,
    seeFullRanking: 'Смотреть полный рейтинг →',
    warmingUp: 'Рейтинги ещё разогреваются — загляните позже.',
    filterEmpty: 'В этом рейтинге нет стримеров по этим фильтрам.',
    filterError: 'Не удалось загрузить отфильтрованный рейтинг.',
    filterRetry: 'Повторить',
    byGameHeading: 'Рейтинги по играм',
    byGameSubtitle: 'Стримеры с наибольшим числом подписчиков в каждой игре и категории.',
    byGameAria: 'Рейтинги популярных игр',
    topGameStreamers: (category) => `Лучшие стримеры ${category}`,
    gameChipStats: (category) => `Статистика стримеров ${category}`,
    whoIsLive: 'Кто сейчас в эфире?',
    climbersThisWeek: 'Главные взлёты недели',
    metricH1: {
      'most-followed': 'Стримеры с наибольшим числом подписчиков',
      'fastest-growing': 'Самые быстрорастущие стримеры',
      'most-watched': 'Самые просматриваемые стримеры',
      'most-active': 'Самые активные стримеры',
      'most-reliable': 'Самые пунктуальные стримеры',
    },
    metricNote: {
      'most-followed':
        'Обновляется ежедневно. Числа подписчиков и фолловеров обновляются регулярно и могут отставать от живых цифр платформ.',
      'fastest-growing':
        'Прирост фолловеров канала (Twitch) или подписчиков (YouTube) за последние 7 дней по ежедневным снимкам каждого отслеживаемого канала. В рейтинг попадают только каналы с положительным ростом. Обновляется ежедневно.',
      'most-watched':
        'Медиана одновременных live-зрителей за последние 28 дней (ежечасная выборка). Обновляется ежедневно.',
      'most-active':
        'Суммарные часы в эфире за последние 28 дней. Каждый стрим считается один раз; круглосуточные 24/7-каналы исключены. Обновляется ежедневно.',
      'most-reliable':
        'Доля анонсированных на Twitch стримов, которые действительно начались в пределах ±30 минут, по последним 20 анонсированным стримам за 90 дней (минимум 10 оценённых). Обновляется ежедневно.',
    },
    tableColStreamer: 'Стример',
    tableColMainGame: 'Основная игра',
    tableColNextStream: 'Следующий стрим',
    tableHeaders: {
      'Followers': 'Фолловеры',
      'Avg viewers': 'Ср. зрителей',
      'Gained (7d)': 'Прирост (7 дн)',
      'Growth': 'Рост',
      'Followers now': 'Фолловеров сейчас',
      'Hours (28d)': 'Часы (28 дн)',
      'Streams / week': 'Стримов / нед.',
      'Avg duration': 'Ср. длительность',
      'On-time rate': 'Пунктуальность',
      'Typical deviation': 'Типичное отклонение',
      'Streams evaluated': 'Оценено стримов',
    },
    trendNewLabel: 'нов.',
    trendNewTitle: 'Неделю назад не было в этом рейтинге',
    trendMoveTitle: (up, delta) => `${up ? 'Плюс' : 'Минус'} ${delta} за неделю`,
    mainGameShareTitle: (pct) => `${pct}% категоризированных стримов`,
    alwaysOnTitle: 'Круглосуточный канал — в эфире 24/7',
    faqHeading: 'Об этих рейтингах',
    faqCalculatedQ: 'Как рассчитываются эти рейтинги стримеров?',
    faqCalculatedA:
      'Каждый рейтинг рассчитывается из реальных данных трансляций, которые мы собираем сами: количество подписчиков и фолловеров, почасовые замеры live-зрителей и история стримов каждого отслеживаемого канала Twitch и YouTube. Никаких самозаявленных цифр.',
    faqUpdatedQ: 'Как часто обновляется статистика?',
    faqUpdatedA:
      'Рейтинги пересчитываются каждую ночь — статистика подписчиков, зрителей и активности обновляется ежедневно, а live-значки и время следующих стримов — в течение дня.',
    faqPlatformsQ: 'Какие платформы охвачены?',
    faqPlatformsA:
      'Twitch и YouTube. Большинство рейтингов объединяют обе платформы — фолловеры на Twitch соответствуют подписчикам на YouTube. Рейтинг пунктуальности учитывает только Twitch, потому что измеряет анонсированные расписания Twitch.',
  },
  recaps: {
    metaTitleSuffix: 'Статистика стримеров Twitch и YouTube',
    weeklyKicker: 'Итоги недели',
    monthlyKicker: 'Итоги месяца',
    readMore: 'Читать полный обзор',
    archiveTitle: 'Архив обзоров',
    archiveIntro:
      'Все еженедельные и ежемесячные обзоры рейтингов: кто поднялся, кто рос быстрее всех и какие клипы смотрели все.',
    allRecaps: 'Все обзоры',
    backToRankings: 'Все рейтинги',
    previousEdition: 'Предыдущий выпуск',
    nextEdition: 'Следующий выпуск',
    translationPending:
      'Этот выпуск ещё не переведён — показан английский оригинал.',
  },
  gamesExplorer: {
    sectionAria: 'Все игры и категории',
    sortAria: 'Сортировка игр',
    sortLabels: { streamers: 'По числу стримеров', hours: 'По часам эфира', trending: 'В тренде' },
    viewTitles: {
      streamers: 'Самые популярные игры на Twitch и YouTube',
      hours: 'Самые транслируемые игры на Twitch и YouTube',
      trending: 'Игры в тренде на Twitch и YouTube',
    },
    searchPlaceholder: 'Поиск игр…',
    searchAria: 'Поиск игр',
    noMatch: 'Нет игр по запросу «{q}».',
  },
  gameChips: {
    aria: (category) => `Статистика ${category}`,
    streamersLabel: (n) =>
      pluralForms('ru', n, {
        one: 'стример',
        few: 'стримера',
        many: 'стримеров',
        other: 'стримера',
      }),
    liveNowLabel: 'сейчас в эфире',
    watchingLabel: 'смотрят',
    streamedLabel: 'стримов · 28 дней',
    streamsLabel: (n) =>
      pluralForms('ru', n, {
        one: 'стрим · 28 дней',
        few: 'стрима · 28 дней',
        many: 'стримов · 28 дней',
        other: 'стрима · 28 дней',
      }),
    peakLead: 'Пик ',
    peakTail: ' зрителей · 28 дней',
    trendTail: ' за неделю',
    trendTitle: 'Изменение числа активных стримеров к прошлой неделе',
  },
  game: {
    notFoundTitle: 'Игра не найдена — Streamer Times',
    metaTitle: (category) => `Стримеры ${category} — Сейчас в эфире, рейтинги и расписание`,
    metaDescription: (category, names) => {
      const tail = `Кто сейчас в эфире, ближайшие стримы и расписания, предсказанные ИИ, на Twitch и YouTube.`;
      const namesLead =
        names.length > 0
          ? `${listConjunction(names, 'ru')} ${names.length === 1 ? 'возглавляет' : 'возглавляют'} рейтинг ${category}. `
          : '';
      const twoNamesLead =
        names.length > 1
          ? `${listConjunction(names.slice(0, 2), 'ru')} возглавляют рейтинг ${category}. `
          : '';
      return [
        `${namesLead}${tail}`,
        `${twoNamesLead}${tail}`,
        `Стримеры ${category} с наибольшим числом подписчиков. ${tail}`,
        tail,
      ];
    },
    ogTitle: (category) => `Стримеры ${category} — сейчас в эфире, рейтинги и расписание`,
    ogDescription: (category, names) => {
      const ogNames = names.length > 0 ? ` — ${listConjunction(names, 'ru')} —` : ':';
      return `Стримеры ${category} с наибольшим числом подписчиков${ogNames} статус эфира и расписание стримов на Twitch и YouTube.`;
    },
    h1: (category) => `Стримеры ${category} — сейчас в эфире и расписание`,
    intro: (shown, category, liveCount, upcomingCount, superlative) => {
      const lead = pluralForms('ru', shown, {
        one: `${shown} стример ведёт или планирует стримы по ${category} на этой неделе на Twitch и YouTube. `,
        few: `${shown} стримера ведут или планируют стримы по ${category} на этой неделе на Twitch и YouTube. `,
        many: `${shown} стримеров ведут или планируют стримы по ${category} на этой неделе на Twitch и YouTube. `,
        other: `${shown} стримера ведут или планируют стримы по ${category} на этой неделе на Twitch и YouTube. `,
      });
      const live =
        liveCount > 0
          ? pluralForms('ru', liveCount, {
              one: `${liveCount} сейчас в эфире`,
              few: `${liveCount} сейчас в эфире`,
              many: `${liveCount} сейчас в эфире`,
              other: `${liveCount} сейчас в эфире`,
            })
          : 'Сейчас никто не в эфире';
      const upcoming =
        upcomingCount > 0
          ? pluralForms('ru', upcomingCount, {
              one: `, впереди ${upcomingCount} стрим в ближайшие 7 дней.`,
              few: `, впереди ${upcomingCount} стрима в ближайшие 7 дней.`,
              many: `, впереди ${upcomingCount} стримов в ближайшие 7 дней.`,
              other: `, впереди ${upcomingCount} стрима в ближайшие 7 дней.`,
            })
          : '.';
      return lead + live + upcoming + superlative;
    },
    superlative: (category, name, value, isTwitch) =>
      ` Больше всего ${isTwitch ? 'фолловеров' : 'подписчиков'} здесь у ${name} — ${value}.`,
    onPageAria: 'На этой странице',
    navLiveNow: 'Сейчас в эфире',
    navTopStreamers: 'Топ стримеров',
    navBestTimes: 'Лучшее время',
    navSchedule: 'Расписание',
    navRelated: 'Похожие игры',
    followGame: (category) => `Следить за ${category}`,
    followingLabel: 'Вы следите',
    watchingNow: (category) => `Сейчас в эфире: ${category}`,
    liveStreamsAria: (category) => `Стримы ${category} в эфире`,
    moreLiveAria: (category) => `Ещё стримы ${category} в эфире`,
    showMoreLive: (n) =>
      pluralForms('ru', n, {
        one: `Показать ещё ${n} канал в эфире`,
        few: `Показать ещё ${n} канала в эфире`,
        many: `Показать ещё ${n} каналов в эфире`,
        other: `Показать ещё ${n} канала в эфире`,
      }),
    moreLiveInRanking: (n, category) =>
      `Ещё ${n} в эфире в полном рейтинге ${category} →`,
    liveUpdatesNote:
      'Статус эфира и число зрителей обновляются каждые несколько минут.',
    mostFollowed: (category) =>
      `Стримеры ${category} с наибольшим числом подписчиков`,
    tableCaption: (category) =>
      `Стримеры ${category} по числу подписчиков, с их ближайшим ожидаемым стримом`,
    thRank: '#',
    thStreamer: 'Стример',
    thNextStream: 'Следующий стрим',
    thFollowers: 'Подписчики',
    thHours: 'Часы / 28 дней',
    liveNowCell: 'Сейчас в эфире',
    seeFullRanking: (category) =>
      `Смотреть полный рейтинг ${category} (топ-50) →`,
    whoStreams: (category) => `Стримеры, которые стримят ${category}`,
    whenStreamed: (category) => `Когда стримят ${category}?`,
    heatmapSummary: (category) =>
      `Большинство стримов по ${category} идёт {peak}{tz} — по данным за последние 4 недели.`,
    heatmapSummaryEmpty: 'По данным за последние 4 недели отслеженных стримов.',
    tzLocalSuffix: ' (ваше время)',
    tzUtcSuffix: ' (UTC)',
    heatmapAria: (category) => `Недельная тепловая карта стримов ${category}.`,
    heatmapAriaWithPeak: (category) =>
      `Недельная тепловая карта стримов ${category}. Самое активное окно: {peak}.`,
    heatmapTooltip: '{day} {from}–{to} · {amount} стримов за 4 недели',
    legendLess: 'Меньше',
    legendMore: 'Больше',
    heatmapDayNames: [
      'по понедельникам',
      'по вторникам',
      'по средам',
      'по четвергам',
      'по пятницам',
      'по субботам',
      'по воскресеньям',
    ],
    bestTimeToStream: (category) => `Лучшее время для стримов по ${category}`,
    trendingBadge: '▲ В тренде',
    bestTimeIntro: (category) =>
      `Для стримеров: окна, когда в ${category} больше всего зрителей на один живой канал.`,
    fullHeatmapLink: 'Полная карта возможностей и анализ →',
    bestSlotsAria: 'Лучшие временные окна',
    viewersPerChannel: '~{score} зрителей/канал',
    timesLocalNote: 'Время в вашем часовом поясе.',
    timesUtcNote: 'Время в UTC.',
    quietTitle: (category) => `Сейчас нет стримов по ${category}`,
    quietBody: (category) =>
      `Никто из стримеров ${category}, за которыми мы следим, не в эфире и не ожидается в ближайшие 7 дней. Расписания и прогнозы ИИ обновляются несколько раз в день — загляните позже.`,
    quietMeanwhile: 'А пока',
    seeWhosLive: 'Посмотрите, кто сейчас в эфире →',
    browseAllGames: 'Все игры',
    gameStreamersChip: (category) => `Стримеры ${category}`,
    scheduleAria: (category) => `Расписание стримов ${category}`,
    upcomingStreams: (category) => `Ближайшие стримы по ${category}`,
    scheduleNote:
      'Время подстраивается под ваш часовой пояс, рядом — время стримера. Дни идут по календарю UTC, поэтому поздний ночной стрим может оказаться под следующим днём.',
    filterAria: 'Фильтр расписания',
    allPlatforms: 'Все платформы',
    hideLowConfidence: 'Скрыть низкую вероятность',
    moreLowConfidence: (n) =>
      pluralForms('ru', n, {
        one: `Ещё ${n} прогноз с низкой вероятностью`,
        few: `Ещё ${n} прогноза с низкой вероятностью`,
        many: `Ещё ${n} прогнозов с низкой вероятностью`,
        other: `Ещё ${n} прогноза с низкой вероятностью`,
      }),
    lowConfAria: (label) => `Прогнозы с низкой вероятностью: ${label}`,
    hiddenNotShown: (n) =>
      pluralForms('ru', n, {
        one: `Ещё ${n} прогноз на этот день не показан. Полное расписание — на странице стримера.`,
        few: `Ещё ${n} прогноза на этот день не показаны. Полное расписание — на странице стримера.`,
        many: `Ещё ${n} прогнозов на этот день не показаны. Полное расписание — на странице стримера.`,
        other: `Ещё ${n} прогноза на этот день не показаны. Полное расписание — на странице стримера.`,
      }),
    relatedGames: 'Похожие игры',
    relatedGamesAria: 'Похожие игры',
    relatedNote:
      'Игры, чьи составы стримеров пересекаются за последние 28 дней.',
    allGamesFooter: '← Все игры и категории',
  },
  gameRanking: {
    notFoundTitle: 'Не найдено — Streamer Times',
    metaTitle: (category, page) =>
      page === 1
        ? `Топ стримеров ${category} — по подписчикам`
        : `Топ стримеров ${category} — по подписчикам — страница ${page}`,
    metaLeadIn: (name, value) => `${name} лидирует с ${value} подписчиков. `,
    metaDescription: (category, leadIn) => [
      `${leadIn}Лучшие стримеры ${category} на Twitch и YouTube по числу подписчиков, со статусом эфира и ближайшими стримами. Обновляется ежедневно.`,
      `${leadIn}Лучшие стримеры ${category} по подписчикам, со статусом эфира и ближайшими стримами.`,
      `Лучшие стримеры ${category} на Twitch и YouTube по числу подписчиков, со статусом эфира и ближайшими стримами. Обновляется ежедневно.`,
    ],
    ogTitle: (category) => `Топ стримеров ${category} — по подписчикам`,
    h1: (category) => `Топ стримеров ${category} по подписчикам`,
    introPage1: (count, category) =>
      pluralForms('ru', count, {
        one: `Топ-${count} стример ${category}, за которым мы следим, по фолловерам и подписчикам канала.`,
        few: `Топ-${count} стримера ${category}, за которыми мы следим, по фолловерам и подписчикам канала.`,
        many: `Топ-${count} стримеров ${category}, за которыми мы следим, по фолловерам и подписчикам канала.`,
        other: `Топ-${count} стримера ${category}, за которыми мы следим, по фолловерам и подписчикам канала.`,
      }),
    topsTheList: (name, value, isTwitch) =>
      ` Список возглавляет ${name} с ${value} ${isTwitch ? 'фолловеров' : 'подписчиков'}.`,
    introPageN: (from, to, total, category) =>
      `Места ${from}–${to} из ${total} стримеров ${category}, за которыми мы следим, по фолловерам и подписчикам канала.`,
    methodology: (category) =>
      `Стримеры, активные в ${category} за последние 28 дней, по числу подписчиков. Цифры обновляются регулярно и могут отставать от платформ.`,
    followersRefreshed: (label) => ` Подписчики обновлены: ${label}`,
    warmingUp:
      'Этот рейтинг ещё разогревается — нам нужно чуть больше данных, чтобы он что-то значил. Загляните позже.',
    missingDataNote:
      '— значит, что по этому каналу пока мало данных, например замеры зрителей у недавно добавленных каналов.',
    sortAria: 'Сортировка рейтинга',
    sortFollowers: 'По подписчикам',
    sortHours: 'По часам (28 дней)',
    sortViewers: 'По зрителям',
    filterLangAria: 'Фильтр по языку',
    allChip: 'Все',
    noMatch: 'Ни один стример не подходит под этот фильтр.',
    tableCaption: (category) => `Стримеры ${category} по числу подписчиков`,
    thRank: '#',
    thStreamer: 'Стример',
    thFollowers: 'Подписчики',
    thAvgViewers: 'Ср. зрители',
    thHours: 'Часы (28 дней)',
    thShare: 'Доля игры',
    thShareTitle: (category) =>
      `Доля последних стримов стримера, посвящённых ${category}`,
    thNextStream: 'Следующий стрим',
    liveNowCell: 'Сейчас в эфире',
    watchingTail: ' · {value} смотрят',
    trendNewBadge: 'нов.',
    trendNewTitle: 'Неделю назад не входил в этот рейтинг',
    trendUpTemplate: 'На {n} выше, чем неделю назад',
    trendDownTemplate: 'На {n} ниже, чем неделю назад',
    mainGameTemplate: 'Основная игра: {share}% последних стримов',
    aboutRanking: 'Об этом рейтинге',
    faqMostFollowedQ: (category) =>
      `У какого стримера ${category} больше всего подписчиков?`,
    faqMostFollowedA: (category, top, second) => {
      const runnerUp = second ? `, впереди ${second.name} с ${second.value}` : '';
      return `${top.name} сейчас лидирует по числу ${top.isTwitch ? 'фолловеров' : 'подписчиков'} среди стримеров ${category}, за которыми мы следим, — ${top.value}${runnerUp}. Цифры обновляются ежедневно.`;
    },
    faqHowManyQ: (category) => `Сколько стримеров стримят ${category}?`,
    faqHowManyA: (category, count, activity) => {
      const tail = activity
        ? ` Вместе они настримили около ${activity.hours} часов ${category} за ${activity.streams} стримов за последние 28 дней.`
        : '';
      const lead = pluralForms('ru', count, {
        one: `Сейчас мы отслеживаем ${count} стримера, который недавно стримил ${category} или держит его в расписании.`,
        few: `Сейчас мы отслеживаем ${count} стримеров, которые недавно стримили ${category} или держат его в расписании.`,
        many: `Сейчас мы отслеживаем ${count} стримеров, которые недавно стримили ${category} или держат его в расписании.`,
        other: `Сейчас мы отслеживаем ${count} стримеров, которые недавно стримили ${category} или держат его в расписании.`,
      });
      return `${lead}${tail}`;
    },
    faqMeasuredQ: 'Как считается этот рейтинг?',
    faqMeasuredA: (category) =>
      `Стримеры, активные в ${category} за последние 28 дней, по числу подписчиков основного канала — фолловеры на Twitch или подписчики на YouTube. Колонки часов и доли берутся из ночного агрегата завершённых стримов по ${category}.`,
    faqShareQ: 'Что значит «Доля игры»?',
    faqShareA: (category) =>
      `Доля последних стримов стримера, посвящённых ${category}. 100 % значит, что сейчас это его единственная игра; низкая доля — признак случайного гостя категории.`,
    relatedRankings: 'Похожие рейтинги',
    relatedRankingsAria: 'Рейтинги похожих игр',
    liveAndSchedule: (category) => `Сейчас в эфире и расписание ${category} →`,
    allRankings: 'Все рейтинги',
    paginationAria: (category) => `Страницы рейтинга ${category}`,
    prev: '← Назад',
    next: 'Вперёд →',
  },
};
