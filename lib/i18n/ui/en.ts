import type { UiLex } from '../types';

// Byte-identical to the strings previously hardcoded in the streamer-page
// components — the English pages must not change at all.
export const en: UiLex = {
  breadcrumb: {
    home: 'Home',
    streamers: 'Streamers',
  },
  hero: {
    featured: 'Featured',
    nowStreaming: 'Now streaming:',
    avatarAlt: (name) => `${name} avatar`,
  },
  promo: {
    valueProps: [
      'Save your favorite streamers',
      'Get notified the moment they go live',
      'Add any new streamer in seconds',
    ],
    qrAria: 'QR code — scan with your phone to get the Streamer Times app',
    getApp: 'Get the app',
  },
  lastStream: {
    heading: 'Last stream',
    pastStream: 'Past stream',
    watchVod: 'Watch VOD →',
    watchAria: (name, title) => `Watch ${name}'s last stream: ${title}`,
  },
  recent: {
    heading: 'Recent streams',
    vodAria: (title) => `Watch VOD: ${title}`,
  },
  channelStats: {
    heading: 'Channel stats',
    followers: 'Followers',
    subscribers: 'Subscribers',
    avgViewers: 'Avg viewers',
    medianDetail: '28-day median',
    peakViewers: 'Peak viewers',
    hoursStreamed: 'Hours streamed',
    lastNDays: (n) => `last ${n} days`,
  },
  stats: {
    heading: (name) => `When does ${name} stream?`,
    caption: (name, tz) => `Typical streaming times for ${name} by weekday, shown in ${tz}`,
    colDay: 'Day',
    colTime: 'Typical time',
    colDuration: 'Duration',
    usuallyNoStream: 'Usually no stream',
    streamsPerWeek: 'Streams per week',
    typicalLength: 'Typical stream length',
    topCategories: 'Most streamed categories',
    basedOn: (n, d) => `Based on ${n} streams over the last ${d} days.`,
    allTimesIn: (tz) => `All times shown in ${tz}`,
    cityTime: (city) => `${city} time`,
    leadSentence: (name, days, times) => {
      const dayWord = days === 1 ? 'day' : 'days';
      const base = `${name} usually streams ${days} ${dayWord} per week`;
      return times
        ? `${base}, typically between ${times.start} and ${times.end} (${times.tzLabel}).`
        : `${base}.`;
    },
  },
  faq: {
    heading: 'Frequently asked questions',
    qIsLive: (name) => `Is ${name} live right now?`,
    aIsLiveCat: (name, cat, platforms) =>
      `Yes — ${name} is live now streaming ${cat} on ${platforms}.`,
    aIsLive: (name, platforms) => `Yes — ${name} is live now on ${platforms}.`,
    qUsually: (name) => `When does ${name} usually stream?`,
    typicallyLast: (duration) => `Streams typically last around ${duration}.`,
    qSchedule: (name) => `What is ${name}'s stream schedule?`,
    aScheduleLead: (name, n) =>
      `${name} has ${n} stream${n === 1 ? '' : 's'} on the schedule for the next 7 days.`,
    nextUp: (entry) => `Next up: ${entry}.`,
    afterThat: (list) => `After that: ${list}.`,
    plusMore: (n) => `Plus ${n} more — see the full schedule above.`,
    predictedNote:
      'Times marked as predictions are estimated by AI from past streaming patterns.',
    outsideDates: (name, time, tz) =>
      `Outside these dates, ${name} typically goes live around ${time} (${tz}) — see the typical streaming times above.`,
    predictedMarker: 'predicted',
    qGames: (name) => `What games does ${name} stream?`,
    aGamesOne: (name, cat) =>
      `${name} is currently streaming ${cat}. Browse the schedule above for upcoming streams.`,
    aGamesMany: (name, list) =>
      `${name} streams ${list}. Browse the schedule above to see what's coming up.`,
    qHowOften: (name) => `How often does ${name} stream?`,
    aAlwaysOn: (name, platforms) =>
      `${name} streams 24/7 — the channel is always live on ${platforms}.`,
    aPerWeek: (name, perWeek, windowDays) =>
      `${name} streams about ${perWeek} times per week on average, based on the last ${windowDays} days of broadcasts.`,
    aScheduleCount: (name, n, daysList) =>
      `${name} has ${n} stream${n === 1 ? '' : 's'} on the schedule for the next 7 days` +
      (daysList ? `, on ${daysList}.` : '.'),
    qWhere: (name) => `Where can I watch ${name}?`,
    aWhere: (name, platforms) =>
      `${name} streams live on ${platforms}. Add ${name} on Streamer Times to track their live status and upcoming streams in one place.`,
    qTimezone: (name) => `What timezone does ${name} stream in?`,
    aTimezone: (name, tzCity) =>
      `${name} is based in the ${tzCity} timezone. The schedule on this page shows each stream in your local time and in ${name}'s local time.`,
    qPredicted: (name) => `Are ${name}'s stream times predicted or confirmed?`,
    aAllPredicted: (name) =>
      `${name}'s upcoming stream times are AI predictions based on past streaming patterns, each shown with a high, medium, or low confidence level. Confirmed times appear here once they're scheduled.`,
    aMixed: (name, predicted, total) =>
      `${name}'s schedule mixes AI predictions with confirmed streams. ${predicted} of the ${total} upcoming times are predicted from past streaming patterns, shown with a confidence level.`,
  },
  empty: {
    heading: 'No upcoming streams scheduled',
    body: (name, platforms) =>
      `We track ${name}'s livestreams on ${platforms}. AI predictions and confirmed schedules will appear here once enough history is collected.`,
    browseAll: 'Browse all streamers',
  },
  related: {
    heading: 'Related streamers',
    liveNowSr: '(live now)',
  },
  games: {
    heading: 'Games',
    navAria: 'Games this streamer plays',
  },
};
