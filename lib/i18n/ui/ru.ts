import { pluralForms } from '../../i18n-core';
import type { UiLex } from '../types';

// Russian — informal streaming register with вы-forms for direct address;
// стрим/стример loanwords as used by the community. Plurals via
// Intl.PluralRules (1 стрим / 2 стрима / 5 стримов).
const streamsN = (n: number) =>
  pluralForms('ru', n, {
    one: `${n} стрим`,
    few: `${n} стрима`,
    many: `${n} стримов`,
    other: `${n} стрима`,
  });

export const ru: UiLex = {
  breadcrumb: {
    home: 'Главная',
    streamers: 'Стримеры',
  },
  hero: {
    featured: 'Рекомендуем',
    nowStreaming: 'Сейчас стримит:',
    avatarAlt: (name) => `Аватар ${name}`,
  },
  promo: {
    valueProps: [
      'Сохраняйте любимых стримеров',
      'Получайте уведомление, как только они выходят в эфир',
      'Добавляйте любого нового стримера за секунды',
    ],
    qrAria: 'QR-код — отсканируйте телефоном, чтобы установить приложение Streamer Times',
    getApp: 'Скачать приложение',
  },
  lastStream: {
    heading: 'Последний стрим',
    pastStream: 'Прошедший стрим',
    watchVod: 'Смотреть VOD →',
    watchAria: (name, title) => `Смотреть последний стрим ${name}: ${title}`,
  },
  recent: {
    heading: 'Недавние стримы',
    vodAria: (title) => `Смотреть VOD: ${title}`,
  },
  channelStats: {
    heading: 'Статистика канала',
    followers: 'Фолловеры',
    subscribers: 'Подписчики',
    avgViewers: 'Средние зрители',
    medianDetail: 'медиана за 28 дней',
    peakViewers: 'Пик зрителей',
    hoursStreamed: 'Часов в эфире',
    lastNDays: (n) =>
      pluralForms('ru', n, {
        one: `за последний ${n} день`,
        few: `за последние ${n} дня`,
        many: `за последние ${n} дней`,
        other: `за последние ${n} дня`,
      }),
  },
  streamerRankings: {
    heading: 'Рейтинги',
    intro: (name) => `Место ${name} в наших рейтингах стримеров.`,
    ofTotal: (total) => `из ${total}`,
    metric: {
      'most-followed': 'Больше всего подписчиков',
      'most-watched': 'Больше всего зрителей',
      'most-active': 'Самые активные',
      'most-reliable': 'Самые пунктуальные',
      'fastest-growing': 'Быстрее всех растут',
    },
    rowAria: (rank, total, label) => `Место ${rank} из ${total} в рейтинге «${label}»`,
    trendUp: (p) => `поднялся на ${p} за неделю`,
    trendDown: (p) => `опустился на ${p} за неделю`,
    byCategory: 'По категориям',
    summary: (name, parts) => `${name} занимает ${parts.join(' и ')} на Streamer Times.`,
  },
  stats: {
    heading: (name) => `Когда стримит ${name}?`,
    // `tz` is the cityTime label ("время Berlin") — dash/colon constructions
    // avoid the case government a preposition would impose on it.
    caption: (name, tz) =>
      `Типичное время стримов ${name} по дням недели — ${tz}`,
    colDay: 'День',
    colTime: 'Обычное время',
    colDuration: 'Длительность',
    usuallyNoStream: 'Обычно без стрима',
    streamsPerWeek: 'Стримов в неделю',
    typicalLength: 'Типичная длительность',
    topCategories: 'Самые частые категории',
    basedOn: (n, d) => {
      const streams = pluralForms('ru', n, {
        one: `${n} стрима`,
        few: `${n} стримов`,
        many: `${n} стримов`,
        other: `${n} стримов`,
      });
      const days = pluralForms('ru', d, {
        one: `${d} день`,
        few: `${d} дня`,
        many: `${d} дней`,
        other: `${d} дня`,
      });
      return `На основе ${streams} за последние ${days}.`;
    },
    allTimesIn: (tz) => `Часовой пояс: ${tz}`,
    cityTime: (city) => `время ${city}`,
    leadSentence: (name, days, times) => {
      const dayWord = pluralForms('ru', days, {
        one: `${days} день`,
        few: `${days} дня`,
        many: `${days} дней`,
        other: `${days} дня`,
      });
      const base = `${name} обычно стримит ${dayWord} в неделю`;
      return times
        ? `${base}, как правило с ${times.start} до ${times.end} (${times.tzLabel}).`
        : `${base}.`;
    },
  },
  faq: {
    heading: 'Частые вопросы',
    qIsLive: (name) => `${name} сейчас в эфире?`,
    aIsLiveCat: (name, cat, platforms) =>
      `Да — ${name} сейчас в эфире, стримит ${cat} на ${platforms}.`,
    aIsLive: (name, platforms) => `Да — ${name} сейчас в эфире на ${platforms}.`,
    qUsually: (name) => `Когда обычно стримит ${name}?`,
    typicallyLast: (duration) => `Стримы обычно длятся около ${duration}.`,
    qSchedule: (name) => `Какое расписание стримов у ${name}?`,
    aScheduleLead: (name, n) =>
      `На ближайшие 7 дней у ${name} в расписании ${streamsN(n)}.`,
    nextUp: (entry) => `Ближайший: ${entry}.`,
    afterThat: (list) => `Затем: ${list}.`,
    plusMore: (n) => `И ещё ${n} — полное расписание выше.`,
    // Colon construction like stats.allTimesIn — avoids the case government
    // a preposition would impose on the cityTime label.
    allTimesNote: (tz) => `Часовой пояс этих значений: ${tz}.`,
    predictedNote:
      'Время с пометкой «прогноз» рассчитано ИИ на основе прошлых стримов.',
    outsideDates: (name, time, tz) =>
      `В остальные дни ${name} обычно выходит в эфир около ${time} (${tz}) — см. типичное время стримов выше.`,
    predictedMarker: 'прогноз',
    qGames: (name) => `Во что играет ${name} на стримах?`,
    aGamesOne: (name, cat) =>
      `Сейчас ${name} стримит ${cat}. Ближайшие стримы — в расписании выше.`,
    aGamesMany: (name, list) =>
      `${name} стримит ${list}. Что дальше — смотрите в расписании выше.`,
    qHowOften: (name) => `Как часто стримит ${name}?`,
    aAlwaysOn: (name, platforms) =>
      `${name} стримит 24/7 — канал всегда в эфире на ${platforms}.`,
    aPerWeek: (name, perWeek, windowDays) =>
      `${name} стримит в среднем примерно ${perWeek} раз(а) в неделю — по данным эфиров за последние ${windowDays} дней.`,
    aScheduleCount: (name, n, daysList) => {
      const base = `На ближайшие 7 дней у ${name} в расписании ${streamsN(n)}`;
      return daysList ? `${base} — по дням: ${daysList}.` : `${base}.`;
    },
    qWhere: (name) => `Где смотреть ${name}?`,
    aWhere: (name, platforms) =>
      `${name} стримит на ${platforms}. Добавьте ${name} в Streamer Times, чтобы следить за статусом эфира и ближайшими стримами в одном месте.`,
    qTimezone: (name) => `В каком часовом поясе стримит ${name}?`,
    aTimezone: (name, tzCity) =>
      `${name} живёт в часовом поясе ${tzCity}. Расписание на этой странице показывает каждый стрим в вашем местном времени и в местном времени стримера.`,
    qPredicted: (name) => `Время стримов ${name} — прогноз или подтверждено?`,
    aAllPredicted: (name) =>
      `Ближайшее время стримов ${name} — это прогнозы ИИ на основе прошлых стримов, каждый с высокой, средней или низкой вероятностью. Подтверждённое время появится здесь, как только его анонсируют.`,
    aMixed: (name, predicted, total) =>
      `Расписание ${name} сочетает прогнозы ИИ и подтверждённые стримы. ${predicted} из ${total} ближайших времён — прогнозы на основе прошлых стримов, с указанием вероятности.`,
  },
  empty: {
    heading: 'Стримов в расписании нет',
    body: (name, platforms) =>
      `Мы отслеживаем эфиры ${name} на ${platforms}. Прогнозы ИИ и подтверждённое расписание появятся здесь, когда накопится достаточно истории.`,
    browseAll: 'Все стримеры',
  },
  related: {
    heading: 'Похожие стримеры',
    liveNowSr: '(сейчас в эфире)',
  },
  games: {
    heading: 'Игры',
    navAria: 'Игры, в которые играет этот стример',
  },
};
