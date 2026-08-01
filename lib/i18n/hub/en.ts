import { formatCompactNumber } from '@/lib/format/number';
import type { HubLex } from './types';

// Byte-identical to the strings previously hardcoded in the hub-page
// components (and, for gamesRoot/rankings, to the lib/games-hub.ts and
// lib/rankings.ts registry values) — the English pages must not change at all.
export const en: HubLex = {
  crumbs: {
    aria: 'Breadcrumb',
    home: 'Home',
    liveNow: 'Live now',
    games: 'Games',
    streamers: 'Streamers',
    rankings: 'Rankings',
    pageN: (n) => `Page ${n}`,
  },
  common: {
    browseStreamersAZ: 'Browse all streamers A–Z',
    allGamesCategories: 'All games & categories',
  },
  home: {
    browseAllGames: 'Browse all games & categories →',
    seeLiveNow: "See everyone who's live right now →",
  },
  homeFeed: {
    ticker: (liveCount, soonCount, soonHours) => {
      const live =
        liveCount > 0
          ? `${liveCount} streamer${liveCount === 1 ? '' : 's'} live right now`
          : '';
      const soon =
        soonCount > 0
          ? `${soonCount} starting in the next ${soonHours} hours`
          : '';
      return live && soon ? `${live} · ${soon}` : live || soon;
    },
    liveTitle: 'Most Watched right now',
    liveFilterCategory: 'Category',
    liveFilterLanguage: 'Language',
    liveFilterAllCategories: 'All categories',
    liveFilterAllLanguages: 'All languages',
    liveFilterOption: (label, count) => `${label} (${count})`,
    liveFilterMatches: (count) => `${count} live ${count === 1 ? 'stream' : 'streams'}`,
    liveFilterReset: 'Reset',
    liveFilterEmpty: 'No live stream matches these filters right now.',
    liveFilterNote: (top, total) =>
      `Top ${top} by current viewers — filters search all ${total} live streams`,
    upNextTitle: "Today's lineup",
    upNextLink: 'Live & starting soon →',
    lineupFilterTime: 'Time',
    lineupFilterAllTimes: 'Any time',
    lineupFilterFrom: (time) => `From ${time}`,
    lineupFilterMatches: (count) => `${count} ${count === 1 ? 'stream' : 'streams'}`,
    lineupFilterEmpty: 'No stream matches these filters.',
    chipAll: 'All',
    chipFavorites: 'My favorites',
    lineupShowAll: (n) => `Show all ${n} streams`,
    lineupShowMore: (n) => `Show ${n} more`,
    lineupShowLess: 'Show less',
    bellAria: (name) => `Get notified when ${name} goes live`,
    upsell: {
      bellTitle: 'Never miss a stream',
      bellBody:
        'Get a push notification right before a stream starts — with the free Streamer Times app.',
      favoritesTitle: 'Your favorites, one tap away',
      favoritesBody:
        'Follow streamers to filter this page down to your own lineup — free, in the app or right here in the browser.',
      appCta: 'Get the app',
      loginCta: 'Sign in free',
      close: 'Maybe later',
    },
    interrupt: {
      title: 'This page — with only your streamers.',
      body: 'Follow your streamers and the guide becomes your personal feed: your lineup, push alerts right before they go live, and their highlights of the week.',
      note: 'Takes 30 seconds · free',
      appCta: 'Get the app',
      loginCta: 'Sign in on the web',
    },
    clipsTitle: 'Clips of the week',
    clipsFilterMatches: (count) => `${count} ${count === 1 ? 'clip' : 'clips'}`,
    clipsFilterEmpty: 'No clip matches these filters.',
    quickFactsTitle: 'Quick facts',
    quickFactsSub: 'Numbers from the streams we track',
    factPredictionLabel: 'Prediction check',
    factPrediction: (hits, total) =>
      `${hits} of ${total} high-confidence forecasts hit the two-hour window around the predicted start.`,
    factPeakLabel: 'Peak of the week',
    factPeak: (name) => `${name} hit the highest concurrent viewers this week.`,
    factReliableLabel: 'Right on time',
    factReliable: (name, hits, total) =>
      `${name} started ${hits} of ${total} recent announced streams on time.`,
    factPauseLabel: 'On a break',
    factPause: (name) => `${name} is on a break until this date.`,
    factMarathonLabel: 'Marathon of the week',
    factMarathon: (name) => `${name} stayed live that long in one go.`,
    factComebackLabel: 'Comeback of the week',
    factComeback: (name, days) =>
      `${name} is back after ${days} days without a stream.`,
    factPrimeTimeLabel: 'Prime time',
    factPrimeTime: (total) =>
      `More streams start at this hour than at any other, across ${total} broadcasts in 4 weeks.`,
    factBusiestDayLabel: 'Busiest day',
    factBusiestDay: (total) =>
      `The weekday that starts the most streams, across ${total} broadcasts in 4 weeks.`,
    factLocalTimeNote: 'your local time',
    factUtcNote: 'UTC',
    factTopCategoryLabel: 'Category of the week',
    factTopCategory: (category, streamers) =>
      `Streams in ${category} over the last 7 days, from ${streamers} ${streamers === 1 ? 'streamer' : 'streamers'}.`,
    factCompetitionLabel: 'Competition level',
    factCompetition: (category) =>
      `Tracked channels live in ${category} at the same time, on average — the most crowded category we follow.`,
    factRoomLabel: 'Room to grow',
    factRoom: (category, channels) =>
      `Viewers per channel in ${category}, with only ${channels} tracked channels live at once.`,
    factRoomSlotLabel: 'Best time',
    risersTitle: 'Risers of the week',
    risersLink: 'All rankings →',
    risersGained: (delta) => `${delta} followers in 7 days`,
    mostStreamedTitle: 'Most streamed this week',
    weekHours: (value) => `${value} h live · 7 days`,
    weekStreams: (n) => `${n} stream${n === 1 ? '' : 's'}`,
    mostWatchedTitle: 'Most watched',
    topStreamersCol: 'Top 5 streamers',
    topCategoriesCol: 'Top 5 categories',
    medianViewers: (value) => `${value} median viewers`,
    hoursStreamed: (value) => `${value} h live · 28 days`,
    followers: (value) => `${value} followers`,
    missingStreamer: 'Your streamer missing? Search & add them →',
    endcap: {
      title: 'Take your lineup with you.',
      bullets: [
        'Follow your favorite streamer',
        'Stream schedule overview',
        'Stats, highlights and more!',
      ],
      webLead: 'Prefer the browser?',
      webLink: 'Create a free account',
      webTail: '— your feed is waiting.',
    },
    sessionBanner: {
      text: 'Welcome back — your personal feed is ready.',
      cta: 'Go to my feed →',
    },
    sectionNav: {
      aria: 'Jump to a section',
      live: 'Live',
      lineup: 'Today',
      trending: 'Trending',
      clips: 'Clips',
      stats: 'Stats',
      discover: 'Streamers',
    },
  },
  hero: {
    claim: 'Stream Schedule. Highlights. Stats. All in One Place.',
    ctaLogin: 'Log in',
    ctaMid: ' or ',
    ctaApp: 'get the App',
    ctaTail: ' to follow your favorite streamers.',
    ctaAppOnlyLink: 'Get the App',
    ctaAppOnlyTail: ' to follow your favorite streamers.',
    kicker: 'Live streamer guide',
    badgeNew: 'New',
    badgeLive: 'Now live on iOS & Android',
    titleLead: 'Live stream schedule for ',
    titleTail: '',
    subtitle: 'The TV guide for streamers.',
    bodyLead:
      'One feed for Twitch and YouTube. Real-time live status, AI-predicted next slots, and zero noise. Free, no account required —',
    bodyLink: 'get the app',
    bodyTail: 'for live alerts.',
    appStoreSub: 'Download on the',
    playSub: 'GET IT ON',
    phoneAlt: "A streamer browsing tonight's lineup on her phone",
    phoneCaption: 'Checking tonight’s lineup',
    statBothLabel: 'Both platforms, one guide',
    statFavoritesValue: 'Your favorites',
    statFavoritesLabel: 'Add any channel in seconds',
    statApiValue: 'Public API',
    statApiLabel: 'Coming soon · join the waitlist',
  },
  upcoming: {
    heading: 'Coming up next',
    aria: 'Upcoming streams',
    empty: 'Nothing scheduled right now — check back soon.',
  },
  trending: {
    heading: 'Trending on Twitch',
    subtitle:
      'What all of Twitch is watching right now.',
    aria: 'Trending games on Twitch',
    rankOnTwitch: (rank) => `#${rank} on Twitch`,
    sortAria: 'Sort games',
    sortTwitch: 'Twitch rank',
    sortHours: 'Hours',
    sortViewers: 'Viewers',
    sortStreamers: 'Streamers',
    liveViewers: (value) => `${value} watching now`,
    streamerCount: (value, count) => `${value} ${count === 1 ? 'streamer' : 'streamers'}`,
  },
  popular: {
    heading: 'Popular streamers',
    viewAll: 'View all streamers →',
  },
  streamerWiki: {
    heading: 'Streamer Wiki',
    subline: 'Who they are, what they play, and when they go live.',
    viewAll: 'Browse all streamers →',
    followers: (value) => `≈${value} followers`,
    streams28d: (count) => `${count} ${count === 1 ? 'stream' : 'streams'} in 28 days`,
    liveNow: 'Live now',
    nextPrefix: 'Next',
  },
  apiPromo: {
    heading: 'Developer API',
    comingSoon: 'Coming soon',
    eyebrow: 'For developers',
    headlineLead: 'Build with the same data —',
    headlineKey: 'soon, on our API.',
    body: "We're onboarding pilot partners now. Join the waitlist and we'll email you the moment public access opens — including a free tier for indie builders.",
    bullets: [
      'Real-time live status & viewer counts',
      'AI-predicted upcoming slots with confidence',
      'Webhooks for “went live” events',
      'OpenAPI spec included',
    ],
    cta: 'Join the waitlist',
  },
  live: {
    h1: 'Live now on Twitch & YouTube',
    intro: (liveCount, categoryCount, soonCount, soonHours = 6) =>
      `${liveCount} streamer${liveCount === 1 ? ' is' : 's are'} live right now` +
      (categoryCount > 0
        ? ` across ${categoryCount} game${categoryCount === 1 ? '' : 's'} and categories`
        : '') +
      '.' +
      (soonCount > 0
        ? ` ${soonCount} more ${soonCount === 1 ? 'is' : 'are'} scheduled to start in the next ${soonHours} hours.`
        : ''),
    introEmpty: `No streamers are live right now — here's who's starting soon.`,
    error: 'Live status is temporarily unavailable. Please try again in a moment.',
    otherCategory: 'Other',
    categoryLiveAria: (name) => `${name} — live now`,
    nLive: (n) => `${n} live`,
    jumpToGame: 'Jump to a game',
    startingSoon: 'Starting soon',
    nextNHours: (n) => `next ${n} hours`,
    emptyAll:
      'Nothing is live or about to start right now. Browse the full streamer directory or explore games to find your next stream.',
    itemListName: 'Streamers live right now on Twitch & YouTube',
  },
  streamers: {
    h1: 'All Twitch & YouTube streamers A–Z',
    intro:
      'Every streamer tracked on Streamer Times — see who is live now and what they stream next. Browse the full list page by page.',
    pageOf: (page, totalPages) => `Page ${page} of ${totalPages}.`,
    error: 'Streamers are temporarily unavailable. Please try again in a moment.',
    paginationAria: 'Pagination',
    prev: '← Previous',
    next: 'Next →',
  },
  games: {
    liveRightNow: 'Live right now',
    liveAria: 'Games with live streams',
    error: 'Games are temporarily unavailable. Please try again in a moment.',
    aboutHeading: 'About these games',
    updatedAt: (stamp) => `Updated ${stamp}.`,
    relatedAria: 'Related pages',
  },
  gamesRoot: {
    h1: 'Most popular games on Twitch & YouTube',
    methodologyNote:
      'Ordered by how many streamers we track in each category over the last 28 days.',
    intro: (gameCount, liveStreamerCount, liveGameCount) => {
      const lead = `We track ${gameCount} game${gameCount === 1 ? '' : 's'} and categories across Twitch and YouTube.`;
      const note =
        'Ordered by how many streamers we track in each category over the last 28 days.';
      if (liveStreamerCount <= 0) return `${lead} ${note}`;
      const streamers = `${formatCompactNumber(liveStreamerCount)} streamer${liveStreamerCount === 1 ? ' is' : 's are'} live right now`;
      const across =
        liveGameCount > 0
          ? ` across ${liveGameCount} ${liveGameCount === 1 ? 'category' : 'categories'}`
          : '';
      return `${lead} ${streamers}${across}. ${note}`;
    },
    faqPopularQ: 'What is the most popular game on Twitch and YouTube?',
    faqPopularA: (top, second) =>
      `${top.category} has the most streamers we track — ${top.count} channel${top.count === 1 ? '' : 's'} streamed it in the last 28 days${second ? `, ahead of ${second.category} with ${second.count}` : ''}.`,
    faqWhoQ: 'Who is streaming right now?',
    faqWhoA: (liveStreamerCount, liveGameCount) =>
      `${liveStreamerCount} streamer${liveStreamerCount === 1 ? ' is' : 's are'} live across ${liveGameCount} ${liveGameCount === 1 ? 'category' : 'categories'}. Open any category to see the live channels and their upcoming streams.`,
    faqRankedQ: 'How are these games ranked?',
    faqRankedA: (gameCount) =>
      `Ordered by how many streamers we track in each category over the last 28 days. Figures come from a nightly aggregate of finished broadcasts across ${gameCount} game${gameCount === 1 ? '' : 's'}; live counts update every few minutes.`,
    faqHoursQ: 'Does "hours streamed" mean watch time?',
    faqHoursA:
      'No. Hours streamed is how long broadcasters were live in a category. We do not report viewer watch time; live viewer counts shown on the cards are a current sample, not a total.',
  },
  rankings: {
    h1: 'Streamer rankings',
    intro: (n) =>
      `Who are the biggest, fastest growing, busiest and most dependable streamers on Twitch and YouTube? ${n} leaderboards over every streamer we track — updated daily from real broadcast data.`,
    dataRefreshed: (label) => ` Data refreshed ${label}.`,
    statStreamersTracked: 'streamers tracked',
    statLiveNow: 'live right now',
    statGamesCategories: 'games & categories',
    seeFullRanking: 'See the full ranking →',
    warmingUp: 'The leaderboards are warming up — check back soon.',
    byGameHeading: 'Rankings by game',
    byGameSubtitle: 'The most followed streamers for each game and category.',
    byGameAria: 'Popular game rankings',
    topGameStreamers: (category) => `Top ${category} streamers`,
    whoIsLive: 'Who is live right now?',
    climbersThisWeek: 'Biggest climbers this week',
    metricH1: {
      'most-followed': 'Most followed streamers',
      'fastest-growing': 'Fastest growing streamers',
      'most-watched': 'Most watched streamers',
      'most-active': 'Most active streamers',
      'most-reliable': 'Most punctual streamers',
    },
    metricNote: {
      'most-followed':
        'Updated daily. Follower and subscriber counts are refreshed regularly and can lag live platform numbers.',
      'fastest-growing':
        'Gain in channel followers (Twitch) or subscribers (YouTube) over the last 7 days, from daily snapshots of every tracked channel. Only channels with positive growth rank. Updated daily.',
      'most-watched':
        'Median concurrent live viewers over the last 28 days (hourly sampling). Updated daily.',
      'most-active':
        'Total hours live in the last 28 days. Each stream is counted once; 24/7 always-on channels are excluded. Updated daily.',
      'most-reliable':
        'Share of announced Twitch streams that actually started within ±30 minutes, over the last 20 announced streams within 90 days (minimum 10 evaluated). Updated daily.',
    },
  },
};
