import { formatCompactNumber } from '@/lib/format/number';
import { pluralForms } from '@/lib/i18n-core';
import type { HubLex } from './types';

/** "3 стримера" / "5 стримеров" — nominative counted noun. */
const nStreamers = (n: number): string =>
  pluralForms('ru', n, {
    one: `${n} стример`,
    few: `${n} стримера`,
    many: `${n} стримеров`,
    other: `${n} стримера`,
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
  },
  homeFeed: {
    // Именной стиль (двоеточие) вместо склонения числительных.
    ticker: (liveCount, soonCount, soonHours) => {
      const live = liveCount > 0 ? `В эфире сейчас: ${liveCount}` : '';
      const soon =
        soonCount > 0 ? `начнут в ближайшие ${soonHours} ч: ${soonCount}` : '';
      return live && soon ? `${live} · ${soon}` : live || soon;
    },
    liveTitle: 'Сейчас в эфире',
    upNextTitle: 'Программа на сегодня',
    upNextLink: 'В эфире и скоро →',
    chipAll: 'Все',
    chipFavorites: 'Мои избранные',
    lineupShowAll: (n) => `Показать все стримы (${n})`,
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
    quickFactsTitle: 'Коротко о главном',
    quickFactsSub: 'По стримам за последние 7 дней',
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
        'Пуш-уведомления, как только твои стримеры выходят в эфир',
        'Виджет ближайших стримов на главном экране',
        'Избранное синхронизировано — телефон и веб',
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
      'Самые крупные игры на Twitch прямо сейчас — наши стримеры пока покрывают не все из них.',
    aria: 'Игры в тренде на Twitch',
    rankOnTwitch: (rank) => `#${rank} на Twitch`,
  },
  popular: {
    heading: 'Популярные стримеры',
    viewAll: 'Все стримеры →',
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
    startingSoon: 'Скоро начнут',
    nextNHours: (n) => `ближайшие ${n} часов`,
    emptyAll:
      'Сейчас никто не в эфире и никто не собирается начинать. Загляните в полный каталог стримеров или изучите игры, чтобы найти свой следующий стрим.',
    itemListName: 'Стримеры, которые сейчас в эфире на Twitch и YouTube',
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
    h1: 'Рейтинги стримеров',
    intro: (n) =>
      `Кто самые крупные, самые быстрорастущие, самые активные и самые надёжные стримеры на Twitch и YouTube? ${n} ${pluralForms('ru', n, {
        one: 'рейтинг',
        few: 'рейтинга',
        many: 'рейтингов',
        other: 'рейтинга',
      })} по всем стримерам, которых мы отслеживаем, — обновляются ежедневно на основе реальных данных трансляций.`,
    dataRefreshed: (label) => ` Данные обновлены ${label}.`,
    statStreamersTracked: 'стримеров отслеживаем',
    statLiveNow: 'сейчас в эфире',
    statGamesCategories: 'игр и категорий',
    seeFullRanking: 'Смотреть полный рейтинг →',
    warmingUp: 'Рейтинги ещё разогреваются — загляните позже.',
    byGameHeading: 'Рейтинги по играм',
    byGameSubtitle: 'Стримеры с наибольшим числом подписчиков в каждой игре и категории.',
    byGameAria: 'Рейтинги популярных игр',
    topGameStreamers: (category) => `Лучшие стримеры ${category}`,
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
  },
};
