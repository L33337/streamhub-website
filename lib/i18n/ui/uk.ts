import { pluralForms } from '../../i18n-core';
import type { UiLex } from '../types';

// Ukrainian — ви-forms for direct address; стрім/стример loanwords as used by
// the community. Plurals via Intl.PluralRules (1 стрім / 2 стріми / 5 стрімів).
const streamsN = (n: number) =>
  pluralForms('uk', n, {
    one: `${n} стрім`,
    few: `${n} стріми`,
    many: `${n} стрімів`,
    other: `${n} стріму`,
  });

export const uk: UiLex = {
  breadcrumb: {
    home: 'Головна',
    streamers: 'Стримери',
  },
  hero: {
    featured: 'Рекомендовано',
    nowStreaming: 'Зараз стрімить:',
    avatarAlt: (name) => `Аватар ${name}`,
  },
  promo: {
    valueProps: [
      'Зберігайте улюблених стримерів',
      'Отримуйте сповіщення, щойно вони виходять в ефір',
      'Додавайте будь-якого нового стримера за секунди',
    ],
    qrAria: 'QR-код — відскануйте телефоном, щоб встановити застосунок Streamer Times',
    getApp: 'Завантажити застосунок',
  },
  lastStream: {
    heading: 'Останній стрім',
    pastStream: 'Минулий стрім',
    watchVod: 'Дивитися VOD →',
    watchAria: (name, title) => `Дивитися останній стрім ${name}: ${title}`,
  },
  recent: {
    heading: 'Нещодавні стріми',
    vodAria: (title) => `Дивитися VOD: ${title}`,
  },
  channelStats: {
    heading: 'Статистика каналу',
    followers: 'Фоловери',
    subscribers: 'Підписники',
    avgViewers: 'Середні глядачі',
    medianDetail: 'медіана за 28 днів',
    peakViewers: 'Пік глядачів',
    hoursStreamed: 'Годин в ефірі',
    lastNDays: (n) =>
      pluralForms('uk', n, {
        one: `за останній ${n} день`,
        few: `за останні ${n} дні`,
        many: `за останні ${n} днів`,
        other: `за останні ${n} дня`,
      }),
  },
  streamerRankings: {
    heading: 'Рейтинги',
    intro: (name) => `Місце ${name} в наших рейтингах стримерів.`,
    ofTotal: (total) => `з ${total}`,
    metric: {
      'most-followed': 'Найбільше підписників',
      'most-watched': 'Найбільше глядачів',
      'most-active': 'Найактивніші',
      'most-reliable': 'Найпунктуальніші',
      'fastest-growing': 'Найшвидше зростають',
    },
    rowAria: (rank, total, label) => `Місце ${rank} з ${total} у рейтингу «${label}»`,
    trendUp: (p) => `піднявся на ${p} за тиждень`,
    trendDown: (p) => `опустився на ${p} за тиждень`,
    byCategory: 'За категоріями',
    summary: (name, parts) => `${name} посідає ${parts.join(' і ')} на Streamer Times.`,
  },
  stats: {
    heading: (name) => `Коли стрімить ${name}?`,
    // `tz` is the cityTime label ("час Kyiv") — dash/colon constructions avoid
    // the case government a preposition would impose on it.
    caption: (name, tz) =>
      `Типовий час стрімів ${name} за днями тижня — ${tz}`,
    colDay: 'День',
    colTime: 'Звичний час',
    colDuration: 'Тривалість',
    usuallyNoStream: 'Зазвичай без стріму',
    streamsPerWeek: 'Стрімів на тиждень',
    typicalLength: 'Типова тривалість',
    topCategories: 'Найчастіші категорії',
    basedOn: (n, d) => {
      const streams = pluralForms('uk', n, {
        one: `${n} стріму`,
        few: `${n} стрімів`,
        many: `${n} стрімів`,
        other: `${n} стрімів`,
      });
      const days = pluralForms('uk', d, {
        one: `${d} день`,
        few: `${d} дні`,
        many: `${d} днів`,
        other: `${d} дня`,
      });
      return `На основі ${streams} за останні ${days}.`;
    },
    allTimesIn: (tz) => `Часовий пояс: ${tz}`,
    cityTime: (city) => `час ${city}`,
    leadSentence: (name, days, times) => {
      const dayWord = pluralForms('uk', days, {
        one: `${days} день`,
        few: `${days} дні`,
        many: `${days} днів`,
        other: `${days} дня`,
      });
      const base = `${name} зазвичай стрімить ${dayWord} на тиждень`;
      return times
        ? `${base}, як правило з ${times.start} до ${times.end} (${times.tzLabel}).`
        : `${base}.`;
    },
  },
  faq: {
    heading: 'Поширені запитання',
    qIsLive: (name) => `${name} зараз в ефірі?`,
    aIsLiveCat: (name, cat, platforms) =>
      `Так — ${name} зараз в ефірі, стрімить ${cat} на ${platforms}.`,
    aIsLive: (name, platforms) => `Так — ${name} зараз в ефірі на ${platforms}.`,
    qUsually: (name) => `Коли зазвичай стрімить ${name}?`,
    typicallyLast: (duration) => `Стріми зазвичай тривають близько ${duration}.`,
    qSchedule: (name) => `Який розклад стрімів у ${name}?`,
    aScheduleLead: (name, n) =>
      `На найближчі 7 днів у ${name} в розкладі ${streamsN(n)}.`,
    nextUp: (entry) => `Найближчий: ${entry}.`,
    afterThat: (list) => `Далі: ${list}.`,
    plusMore: (n) => `І ще ${n} — повний розклад вище.`,
    // Colon construction like stats.allTimesIn — avoids the case government
    // a preposition would impose on the cityTime label.
    allTimesNote: (tz) => `Часовий пояс цих значень: ${tz}.`,
    predictedNote:
      'Час із позначкою «прогноз» розраховано ШІ на основі минулих стрімів.',
    outsideDates: (name, time, tz) =>
      `В інші дні ${name} зазвичай виходить в ефір близько ${time} (${tz}) — див. типовий час стрімів вище.`,
    predictedMarker: 'прогноз',
    qGames: (name) => `У що грає ${name} на стрімах?`,
    aGamesOne: (name, cat) =>
      `Зараз ${name} стрімить ${cat}. Найближчі стріми — у розкладі вище.`,
    aGamesMany: (name, list) =>
      `${name} стрімить ${list}. Що далі — дивіться в розкладі вище.`,
    qHowOften: (name) => `Як часто стрімить ${name}?`,
    aAlwaysOn: (name, platforms) =>
      `${name} стрімить 24/7 — канал завжди в ефірі на ${platforms}.`,
    aPerWeek: (name, perWeek, windowDays) =>
      `${name} стрімить у середньому приблизно ${perWeek} рази(-ів) на тиждень — за даними ефірів за останні ${windowDays} днів.`,
    aScheduleCount: (name, n, daysList) => {
      const base = `На найближчі 7 днів у ${name} в розкладі ${streamsN(n)}`;
      return daysList ? `${base} — за днями: ${daysList}.` : `${base}.`;
    },
    qWhere: (name) => `Де дивитися ${name}?`,
    aWhere: (name, platforms) =>
      `${name} стрімить на ${platforms}. Додайте ${name} у Streamer Times, щоб стежити за статусом ефіру та найближчими стрімами в одному місці.`,
    qTimezone: (name) => `У якому часовому поясі стрімить ${name}?`,
    aTimezone: (name, tzCity) =>
      `${name} живе в часовому поясі ${tzCity}. Розклад на цій сторінці показує кожен стрім у вашому місцевому часі та в місцевому часі стримера.`,
    qPredicted: (name) => `Час стрімів ${name} — прогноз чи підтверджено?`,
    aAllPredicted: (name) =>
      `Найближчий час стрімів ${name} — це прогнози ШІ на основі минулих стрімів, кожен із високою, середньою або низькою ймовірністю. Підтверджений час з'явиться тут, щойно його анонсують.`,
    aMixed: (name, predicted, total) =>
      `Розклад ${name} поєднує прогнози ШІ та підтверджені стріми. ${predicted} із ${total} найближчих часів — прогнози на основі минулих стрімів, із зазначенням ймовірності.`,
  },
  empty: {
    heading: 'Стрімів у розкладі немає',
    body: (name, platforms) =>
      `Ми відстежуємо ефіри ${name} на ${platforms}. Прогнози ШІ та підтверджений розклад з'являться тут, коли назбирається достатньо історії.`,
    browseAll: 'Усі стримери',
  },
  related: {
    heading: 'Схожі стримери',
    liveNowSr: '(зараз в ефірі)',
  },
  games: {
    heading: 'Ігри',
    navAria: 'Ігри, у які грає цей стример',
  },
};
