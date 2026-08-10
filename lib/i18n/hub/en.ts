import { formatCompactNumber } from '@/lib/format/number';
import { formatNameList } from '@/lib/game-ranking';
import type { HubLex } from './types';

// Byte-identical to the strings previously hardcoded in the hub-page
// components (and, for gamesRoot/rankings, to the lib/games-hub.ts and
// lib/rankings.ts registry values) — the English pages must not change at all.
export const en: HubLex = {
  crumbs: {
    aria: 'Breadcrumb',
    home: 'Home',
    liveNow: 'Live now',
    tonight: 'Tonight',
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
    qrTitle: 'Scan to download Streamer Times',
    qrHeading: 'Scan to download',
    qrHint: 'Point your phone camera here',
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
    upNextTonightLink: 'The full evening →',
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
  tonight: {
    h1: "Who's streaming tonight?",
    h1Night: "Who's streaming tonight",
    intro: (total, names) =>
      `${total} stream${total === 1 ? ' is' : 's are'} lined up for tonight on Twitch and YouTube` +
      (names ? `, including ${names}` : '') +
      '.',
    introEmpty:
      'Nothing is scheduled for tonight yet. Predictions fill in through the day as streamers finish their current broadcasts.',
    timesInZone: (zone) => `All times ${zone}`,
    timesLocal: 'All times in your timezone',
    error: "Tonight's line-up is temporarily unavailable. Please try again in a moment.",
    jumpAria: 'Jump to a time of the evening',
    liveNowHeading: 'Already live',
    liveNowLink: 'See everyone live now',
    primetimeHeading: 'Tonight’s highlights',
    primetimeSub: (time) => `The biggest names going live around ${time}.`,
    blockFrom: (time) => `From ${time}`,
    blockNight: 'Late night',
    blockCount: (n) => `${n} stream${n === 1 ? '' : 's'}`,
    quietBody:
      'Check back later, or see who is live right now — the evening usually fills up after 6 PM.',
    aboutHeading: 'About tonight’s guide',
    aboutBody:
      'This page is the evening view of Streamer Times: every Twitch and YouTube stream we expect between 6 PM and 6 AM, grouped by the time it starts, so you can plan an evening the way you would with a TV guide.',
    faqWhatQ: 'What is on tonight?',
    faqWhatA:
      'The blocks above list every stream scheduled or predicted for this evening, earliest first. Announced streams come straight from the streamer’s own schedule; the rest are predicted from their streaming history, with a confidence badge on every card.',
    faqHowQ: 'How do you know when someone will stream?',
    faqHowA:
      'We track each channel’s broadcast history and their announcements, then predict the next start. High confidence means a strong, regular pattern or an announced date; low confidence means the schedule has been irregular lately.',
    faqTimesQ: 'Which timezone are the times in?',
    faqTimesA: (zone) =>
      `Times are listed in ${zone} and switch to your own timezone once the page loads. The evening runs from 6 PM to 6 AM, so a stream starting after midnight is still part of tonight.`,
    itemListName: 'Streams tonight on Twitch & YouTube',
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
    seeFullRanking: 'See the full ranking →',
    warmingUp: 'The leaderboards are warming up — check back soon.',
    filterEmpty: 'No streamer in this ranking matches these filters.',
    filterError: 'The filtered ranking could not be loaded.',
    filterRetry: 'Try again',
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
    tableColStreamer: 'Streamer',
    tableColMainGame: 'Main game',
    tableColNextStream: 'Next stream',
    tableHeaders: {
      'Followers': 'Followers',
      'Avg viewers': 'Avg viewers',
      'Gained (7d)': 'Gained (7d)',
      'Growth': 'Growth',
      'Followers now': 'Followers now',
      'Hours (28d)': 'Hours (28d)',
      'Streams / week': 'Streams / week',
      'Avg duration': 'Avg duration',
      'On-time rate': 'On-time rate',
      'Typical deviation': 'Typical deviation',
      'Streams evaluated': 'Streams evaluated',
    },
    trendNewLabel: 'new',
    trendNewTitle: 'Not in this ranking a week ago',
    trendMoveTitle: (up, delta) => `${up ? 'Up' : 'Down'} ${delta} since last week`,
    mainGameShareTitle: (pct) => `${pct}% of their categorized streams`,
    alwaysOnTitle: 'Always-on channel — live around the clock',
  },
  recaps: {
    weeklyKicker: 'Weekly recap',
    monthlyKicker: 'Monthly recap',
    readMore: 'Read the full recap',
    archiveTitle: 'Streamer recap archive',
    archiveIntro:
      'Every weekly and monthly recap of the rankings: who climbed, who grew fastest, and the clips everyone watched.',
    allRecaps: 'All recaps',
    backToRankings: 'All rankings',
    previousEdition: 'Previous edition',
    nextEdition: 'Next edition',
    translationPending:
      'This edition has not been translated yet — showing the English original.',
  },
  gamesExplorer: {
    sectionAria: 'All games and categories',
    sortAria: 'Sort games',
    sortLabels: { streamers: 'Most streamers', hours: 'Most streamed', trending: 'Trending' },
    viewTitles: {
      streamers: 'Most popular games on Twitch & YouTube',
      hours: 'Most streamed games on Twitch & YouTube',
      trending: 'Trending games on Twitch & YouTube',
    },
    searchPlaceholder: 'Search games…',
    searchAria: 'Search games',
    noMatch: 'No games match “{q}”.',
  },
  gameChips: {
    aria: (category) => `${category} statistics`,
    streamersLabel: (n) => (n === 1 ? 'streamer' : 'streamers'),
    liveNowLabel: 'live now',
    watchingLabel: 'watching',
    streamedLabel: 'streamed / 28d',
    streamsLabel: () => 'streams / 28d',
    peakLead: 'Peak ',
    peakTail: ' viewers / 28d',
    trendTail: ' this week',
    trendTitle: 'Week-over-week change in active streamers',
  },
  game: {
    notFoundTitle: 'Game not found — StreamerTimes',
    metaTitle: (category) => `${category} Streamers — Live Now, Rankings & Schedule`,
    metaDescription: (category, names) => {
      const tail = `Who is live now, upcoming streams and AI-predicted schedules on Twitch and YouTube.`;
      const namesLead =
        names.length > 0
          ? `${formatNameList(names)} lead${names.length === 1 ? 's' : ''} the ${category} ranking. `
          : '';
      const twoNamesLead =
        names.length > 1
          ? `${formatNameList(names.slice(0, 2))} lead the ${category} ranking. `
          : '';
      return [
        `${namesLead}${tail}`,
        `${twoNamesLead}${tail}`,
        `The most followed ${category} streamers. ${tail}`,
        tail,
      ];
    },
    ogTitle: (category) => `${category} streamers — live now, rankings & schedule`,
    ogDescription: (category, names) => {
      const ogNames = names.length > 0 ? ` — ${formatNameList(names)} —` : ',';
      return `The most followed ${category} streamers${ogNames} live status and stream schedule on Twitch and YouTube.`;
    },
    h1: (category) => `${category} streamers — live now & schedule`,
    intro: (shown, category, liveCount, upcomingCount, superlative) =>
      `${shown} streamer${shown === 1 ? '' : 's'} ${shown === 1 ? 'has' : 'have'} ${category} streams live or scheduled this week on Twitch and YouTube. ` +
      (liveCount > 0
        ? `${liveCount} ${liveCount === 1 ? 'is' : 'are'} live right now`
        : 'None are live right now') +
      (upcomingCount > 0
        ? `, with ${upcomingCount} upcoming stream${upcomingCount === 1 ? '' : 's'} in the next 7 days.`
        : '.') +
      superlative,
    superlative: (category, name, value, isTwitch) =>
      ` The most-followed ${category} streamer here is ${name} with ${value} ${isTwitch ? 'followers' : 'subscribers'}.`,
    onPageAria: 'On this page',
    navLiveNow: 'Live now',
    navTopStreamers: 'Top streamers',
    navBestTimes: 'Best times',
    navSchedule: 'Schedule',
    navRelated: 'Related games',
    followGame: (category) => `Follow ${category}`,
    followingLabel: 'Following',
    watchingNow: (category) => `Watching ${category} now`,
    liveStreamsAria: (category) => `Live ${category} streams`,
    moreLiveAria: (category) => `More live ${category} streams`,
    showMoreLive: (n) => `Show ${n} more live channel${n === 1 ? '' : 's'}`,
    moreLiveInRanking: (n, category) =>
      `${n} more live in the full ${category} ranking →`,
    liveUpdatesNote: 'Live status and viewer counts update every few minutes.',
    mostFollowed: (category) => `Most followed ${category} streamers`,
    tableCaption: (category) =>
      `${category} streamers ranked by follower count, with their next expected stream`,
    thRank: '#',
    thStreamer: 'Streamer',
    thNextStream: 'Next stream',
    thFollowers: 'Followers',
    thHours: 'Hours / 28d',
    liveNowCell: 'Live now',
    seeFullRanking: (category) => `See the full ${category} ranking (top 50) →`,
    whoStreams: (category) => `Streamers who stream ${category}`,
    whenStreamed: (category) => `When is ${category} streamed?`,
    heatmapSummary: (category) =>
      `Most ${category} streams run on {peak}{tz} — based on the last 4 weeks of tracked broadcasts.`,
    heatmapSummaryEmpty: 'Based on the last 4 weeks of tracked broadcasts.',
    tzLocalSuffix: ' (your local time)',
    tzUtcSuffix: ' (UTC)',
    heatmapAria: (category) => `Weekly streaming heatmap for ${category}.`,
    heatmapAriaWithPeak: (category) =>
      `Weekly streaming heatmap for ${category}. Busiest window: {peak}.`,
    heatmapTooltip: '{day} {from}–{to} · {amount} streamed in 4 weeks',
    legendLess: 'Less',
    legendMore: 'More',
    heatmapDayNames: [
      'Mondays',
      'Tuesdays',
      'Wednesdays',
      'Thursdays',
      'Fridays',
      'Saturdays',
      'Sundays',
    ],
    bestTimeToStream: (category) => `Best time to stream ${category}`,
    trendingBadge: '▲ Trending',
    bestTimeIntro: (category) =>
      `For streamers: the windows where ${category} viewers outnumber live ${category} channels the most.`,
    fullHeatmapLink: 'Full opportunity heatmap & analysis →',
    bestSlotsAria: 'Best time slots',
    viewersPerChannel: '~{score} viewers/channel',
    timesLocalNote: 'Times shown in your local timezone.',
    timesUtcNote: 'Times shown in UTC.',
    quietTitle: (category) => `No ${category} streams right now`,
    quietBody: (category) =>
      `None of the ${category} streamers we track are live or expected in the next 7 days. Schedules and AI predictions refresh several times a day — check back soon.`,
    quietMeanwhile: 'In the meantime',
    seeWhosLive: `See who's live now →`,
    browseAllGames: 'Browse all games',
    gameStreamersChip: (category) => `${category} streamers`,
    scheduleAria: (category) => `${category} stream schedule`,
    upcomingStreams: (category) => `Upcoming ${category} streams`,
    scheduleNote: `Times adjust to your local timezone, with the streamer's own time alongside. Days follow the UTC calendar, so a late-night stream can appear under the next day.`,
    filterAria: 'Filter the schedule',
    allPlatforms: 'All platforms',
    hideLowConfidence: 'Hide low confidence',
    moreLowConfidence: (n) =>
      `${n} more prediction${n === 1 ? '' : 's'} with low confidence`,
    lowConfAria: (label) => `Low-confidence predictions on ${label}`,
    hiddenNotShown: (n) =>
      `${n} more prediction${n === 1 ? '' : 's'} for this day ${n === 1 ? 'is' : 'are'} not shown. Open a streamer's page for their full schedule.`,
    relatedGames: 'Related games',
    relatedGamesAria: 'Related games',
    relatedNote: 'Games with overlapping streamer rosters in the last 28 days.',
    allGamesFooter: '← All games & categories',
  },
  gameRanking: {
    notFoundTitle: 'Not found — StreamerTimes',
    metaTitle: (category, page) =>
      page === 1
        ? `Top ${category} Streamers — Ranked by Followers`
        : `Top ${category} Streamers — Ranked by Followers — Page ${page}`,
    metaLeadIn: (name, value) => `${name} leads with ${value} followers. `,
    metaDescription: (category, leadIn) => [
      `${leadIn}The top ${category} streamers on Twitch and YouTube ranked by followers, with live status and next streams. Updated daily.`,
      `${leadIn}The top ${category} streamers ranked by followers, with live status and next streams.`,
      `The top ${category} streamers on Twitch and YouTube ranked by followers, with live status and next streams. Updated daily.`,
    ],
    ogTitle: (category) => `Top ${category} streamers — ranked by followers`,
    h1: (category) => `Top ${category} streamers by followers`,
    introPage1: (count, category) =>
      `The top ${count} ${category} streamer${count === 1 ? '' : 's'} we track, ranked by channel followers and subscribers.`,
    topsTheList: (name, value, isTwitch) =>
      ` ${name} tops the list with ${value} ${isTwitch ? 'followers' : 'subscribers'}.`,
    introPageN: (from, to, total, category) =>
      `Ranks ${from}–${to} of ${total} ${category} streamers we track, ranked by channel followers and subscribers.`,
    methodology: (category) =>
      `Streamers active in ${category} over the last 28 days, ranked by followers. Counts refresh regularly and can lag live platform numbers.`,
    followersRefreshed: (label) => ` Follower counts refreshed ${label}.`,
    warmingUp: `This ranking is warming up — we need a bit more data before it's meaningful. Check back soon.`,
    missingDataNote: `— means we haven't collected enough data for that channel yet, for example viewer sampling for recently added channels.`,
    sortAria: 'Sort ranking',
    sortFollowers: 'Most followed',
    sortHours: 'Most hours (28d)',
    sortViewers: 'Most watched',
    filterLangAria: 'Filter by language',
    allChip: 'All',
    noMatch: 'No streamers match this filter.',
    tableCaption: (category) => `${category} streamers ranked by follower count`,
    thRank: '#',
    thStreamer: 'Streamer',
    thFollowers: 'Followers',
    thAvgViewers: 'Avg viewers',
    thHours: 'Hours (28d)',
    thShare: 'Game share',
    thShareTitle: (category) =>
      `Share of the streamer's recent broadcasts that were ${category}`,
    thNextStream: 'Next stream',
    liveNowCell: 'Live now',
    watchingTail: ' · {value} watching',
    trendNewBadge: 'new',
    trendNewTitle: 'Not in this ranking a week ago',
    trendUpTemplate: 'Up {n} since last week',
    trendDownTemplate: 'Down {n} since last week',
    mainGameTemplate: 'Main game: {share}% of their recent broadcasts',
    aboutRanking: 'About this ranking',
    faqMostFollowedQ: (category) => `Who is the most followed ${category} streamer?`,
    faqMostFollowedA: (category, top, second) => {
      const runnerUp = second ? `, ahead of ${second.name} with ${second.value}` : '';
      return `${top.name} is currently the most followed ${category} streamer we track, with ${top.value} ${top.isTwitch ? 'followers' : 'subscribers'}${runnerUp}. Counts are refreshed daily.`;
    },
    faqHowManyQ: (category) => `How many streamers stream ${category}?`,
    faqHowManyA: (category, count, activity) => {
      const tail = activity
        ? ` Together they streamed about ${activity.hours} hours of ${category} across ${activity.streams} streams in the last 28 days.`
        : '';
      return `We currently track ${count} streamer${count === 1 ? '' : 's'} who streamed ${category} recently or have it on their schedule.${tail}`;
    },
    faqMeasuredQ: 'How is this ranking measured?',
    faqMeasuredA: (category) =>
      `Streamers active in ${category} over the last 28 days, ranked by the follower count of their primary channel — channel followers on Twitch or subscribers on YouTube. The hours and share columns come from a nightly aggregate of finished ${category} broadcasts.`,
    faqShareQ: 'What does "Game share" mean?',
    faqShareA: (category) =>
      `The share of a streamer's recent broadcasts that were ${category}. 100% means it is currently their only game; a low share marks an occasional visitor to the category.`,
    relatedRankings: 'Related rankings',
    relatedRankingsAria: 'Related game rankings',
    liveAndSchedule: (category) => `Live now & schedule for ${category} →`,
    allRankings: 'All rankings',
    paginationAria: (category) => `${category} ranking pages`,
    prev: '← Previous',
    next: 'Next →',
  },
};
