// --- Hub-pages UI lexicon type ---------------------------------------------------
//
// Shape of one language's lexicon for the five indexable hub-page bodies
// (M22 P3): home /, /live, /streamers, /games (root view) and /rankings.
// Server components only — see the header of lib/i18n-hub.ts.
// `Record<UiLang, HubLex>` in lib/i18n-hub.ts turns this interface into a
// compile-time completeness check: a missing key in any language fails
// `next build`.
//
// Authoring rules (see lib/i18n-slot.ts header for the full register spec):
// informal streaming tone (de du-form, fr tu-form, ja です/ます); brands
// (Twitch, YouTube, Streamer Times, App Store, Google Play), game/category
// names and "UTC" untranslated; "A–Z" may be adapted where a language would
// not use it. The 'en' entries are byte-identical to the previously
// hardcoded strings — English pages must not change by a single character.

/** Metric slugs of the /rankings leaderboards — mirrors RankingMetric. */
export type HubRankingMetric =
  | 'most-followed'
  | 'fastest-growing'
  | 'most-watched'
  | 'most-active'
  | 'most-reliable';

export interface HubLex {
  /** Breadcrumb names, shared by visible breadcrumbs and JSON-LD
   *  BreadcrumbList. Deliberate near-duplicates of lib/i18n-chrome.ts strings:
   *  chrome's nav/footer variants are context-bound link labels ("Live" nav
   *  tab, "Live now" footer column) while these are crumb names. */
  crumbs: {
    /** aria-label of the visible breadcrumb <nav>. */
    aria: string;
    home: string;
    liveNow: string;
    games: string;
    streamers: string;
    rankings: string;
    /** Trailing crumb of a paginated index page, e.g. "Page 3". */
    pageN(n: number): string;
  };
  /** Strings shared verbatim by several hub pages. */
  common: {
    /** Footer cross-link label; /games appends its own " →". */
    browseStreamersAZ: string;
    /** Heading on /games AND link label on /live and /rankings. */
    allGamesCategories: string;
  };
  home: {
    /** In-body link under the trending rail. */
    browseAllGames: string;
    /** In-body link to /live. */
    seeLiveNow: string;
  };
  /**
   * Feed-style homepage sections (homepage rebuild 2026-07-27). Server
   * components only; client islands (upsell sheet, session banner, chips)
   * receive the resolved strings as props — every value that crosses a client
   * boundary must be a plain string, so functions here are always invoked
   * server-side first.
   */
  homeFeed: {
    /**
     * Live ticker chip under the H1, e.g. "214 streamers live right now · 38
     * starting in the next 6 hours". Either clause drops when its count is 0;
     * never called with both 0 (the chip is hidden then).
     */
    ticker(liveCount: number, soonCount: number, soonHours: number): string;
    /** "Live now" rail heading. */
    liveTitle: string;
    /** "Today's lineup" prediction list heading. */
    upNextTitle: string;
    /** Section link to /live. */
    upNextLink: string;
    chipAll: string;
    /** Locked favorites chip (needs an account). */
    chipFavorites: string;
    /** Expand button under the clamped lineup, e.g. "Show all 24 streams". */
    lineupShowAll(n: number): string;
    lineupShowLess: string;
    /** aria-label of the reminder bell on an upcoming slot card. */
    bellAria(name: string): string;
    /** Conversion sheet opened by the bell / locked favorites chip. */
    upsell: {
      bellTitle: string;
      bellBody: string;
      favoritesTitle: string;
      favoritesBody: string;
      appCta: string;
      loginCta: string;
      close: string;
    };
    /** Interrupt card after the first two content sections. */
    interrupt: {
      title: string;
      body: string;
      /** Small reassurance line under the body, e.g. "Takes 30 seconds · free". */
      note: string;
      appCta: string;
      loginCta: string;
    };
    clipsTitle: string;
    quickFactsTitle: string;
    quickFactsSub: string;
    factPredictionLabel: string;
    /** Sentence under the big percentage; standalone (not a continuation). */
    factPrediction(hits: number, total: number): string;
    factPeakLabel: string;
    factPeak(name: string): string;
    factReliableLabel: string;
    factReliable(name: string, hits: number, total: number): string;
    factPauseLabel: string;
    /** Big value is the localized return date, rendered by the component. */
    factPause(name: string): string;
    risersTitle: string;
    risersLink: string;
    /** Secondary line of a riser row; delta is preformatted incl. sign. */
    risersGained(delta: string): string;
    /** "Most streamed this week" (featured streamers, 7-day session union). */
    mostStreamedTitle: string;
    /** Value lines for the most-streamed rows; hours preformatted. */
    weekHours(value: string): string;
    weekStreams(n: number): string;
    mostWatchedTitle: string;
    topStreamersCol: string;
    topCategoriesCol: string;
    /** Value lines; numbers are preformatted via formatCompactNumber. */
    medianViewers(value: string): string;
    hoursStreamed(value: string): string;
    followers(value: string): string;
    /** Search & add hint under the popular grid. */
    missingStreamer: string;
    endcap: {
      title: string;
      bullets: [string, string, string];
      /** "Prefer the browser?" lead + link + tail around the account link. */
      webLead: string;
      webLink: string;
      webTail: string;
    };
    /** Client-side banner for signed-in visitors. */
    sessionBanner: {
      text: string;
      cta: string;
    };
    /**
     * Sticky section-jump chips under the site header (UX round 2026-07-27).
     * Labels must stay SHORT (one word where the language allows) — the row
     * scrolls horizontally on mobile and every extra character costs reach.
     */
    sectionNav: {
      /** aria-label of the nav element. */
      aria: string;
      live: string;
      lineup: string;
      trending: string;
      clips: string;
      stats: string;
      discover: string;
    };
  };
  hero: {
    /** Overline next to the date chip. */
    kicker: string;
    badgeNew: string;
    badgeLive: string;
    /** H1 around the untranslated "Twitch & YouTube" brand fragment:
     *  `{titleLead}<span>Twitch & YouTube</span>{titleTail}`. Either part may
     *  be '' (ja leads with the brand); trailing/leading spaces are
     *  significant. */
    titleLead: string;
    titleTail: string;
    subtitle: string;
    /** Body sentence before the inline get-the-app link; ends with the dash,
     *  the JSX inserts the surrounding spaces. */
    bodyLead: string;
    bodyLink: string;
    bodyTail: string;
    /** Small caption line of the store badges, phrased like the official
     *  localized badges; "App Store"/"Google Play" stay untranslated below. */
    appStoreSub: string;
    playSub: string;
    phoneAlt: string;
    phoneCaption: string;
    statBothLabel: string;
    statFavoritesValue: string;
    statFavoritesLabel: string;
    statApiValue: string;
    statApiLabel: string;
  };
  upcoming: {
    heading: string;
    /** aria-label of the slot grid. */
    aria: string;
    empty: string;
  };
  trending: {
    heading: string;
    subtitle: string;
    /** aria-label of the rail section. */
    aria: string;
    /** Rank chip under a box art, e.g. "#3 on Twitch". */
    rankOnTwitch(rank: number): string;
  };
  popular: {
    /** Heading AND aria-label of the popular-streamers footer nav. */
    heading: string;
    viewAll: string;
  };
  apiPromo: {
    heading: string;
    comingSoon: string;
    /** Eyebrow text after the untranslated "/ DEV" tag. */
    eyebrow: string;
    /** Headline around the styled span: `{headlineLead} <span>{headlineKey}</span>`. */
    headlineLead: string;
    headlineKey: string;
    body: string;
    bullets: [string, string, string, string];
    cta: string;
  };
  live: {
    h1: string;
    /**
     * Full intro sentence(s): "{live} streamers are live right now across
     * {categories} games and categories. {soon} more are scheduled to start in
     * the next {hours} hours." The category clause drops when categoryCount is
     * 0; the second sentence drops when soonCount is 0. Only called with
     * liveCount > 0.
     */
    intro(liveCount: number, categoryCount: number, soonCount: number, soonHours?: number): string;
    /** Intro variant when nobody is live. */
    introEmpty: string;
    error: string;
    /** Category heading for slots without a category. */
    otherCategory: string;
    /** aria-label of a category section, e.g. "Minecraft — live now". */
    categoryLiveAria(name: string): string;
    /** Count chip next to a category heading, e.g. "4 live". */
    nLive(n: number): string;
    startingSoon: string;
    /** Chip next to "Starting soon", e.g. "next 6 hours". */
    nextNHours(n: number): string;
    /** Empty state when nothing is live and nothing starts soon. */
    emptyAll: string;
    /** JSON-LD ItemList name. */
    itemListName: string;
  };
  streamers: {
    h1: string;
    intro: string;
    /** Appended to the intro on paginated views, e.g. "Page 2 of 5." */
    pageOf(page: number, totalPages: number): string;
    error: string;
    /** aria-label of the pagination nav. */
    paginationAria: string;
    prev: string;
    next: string;
  };
  games: {
    /** "Live right now" heading; the footer link appends its own " →". */
    liveRightNow: string;
    /** aria-label of the live-games section. */
    liveAria: string;
    error: string;
    aboutHeading: string;
    /** Freshness suffix after the methodology note, e.g. "Updated 04:15 UTC."
     *  The stamp stays in the "{HH}:{MM} UTC" form. */
    updatedAt(stamp: string): string;
    /** aria-label of the related-pages footer nav. */
    relatedAria: string;
  };
  /**
   * ROOT /games view only (the spec used by /games): localized counterparts of
   * the lib/games-hub.ts registry values and copy builders for the 'streamers'
   * sort mode. Non-root views (/games/most-streamed, /games/trending) keep the
   * English registry values. The 'en' entries mirror the builders byte-for-byte.
   */
  gamesRoot: {
    h1: string;
    methodologyNote: string;
    /** Mirrors buildGamesHubIntro(): lead + optional live clause + note. */
    intro(gameCount: number, liveStreamerCount: number, liveGameCount: number): string;
    faqPopularQ: string;
    faqPopularA(
      top: { category: string; count: number },
      second: { category: string; count: number } | null,
    ): string;
    faqWhoQ: string;
    faqWhoA(liveStreamerCount: number, liveGameCount: number): string;
    faqRankedQ: string;
    faqRankedA(gameCount: number): string;
    faqHoursQ: string;
    faqHoursA: string;
  };
  rankings: {
    h1: string;
    /** Intro paragraph; n = number of rendered leaderboards. */
    intro(n: number): string;
    /** Freshness span INCLUDING its leading space, e.g. " Data refreshed Jul 18, 2026." */
    dataRefreshed(label: string): string;
    statStreamersTracked: string;
    statLiveNow: string;
    statGamesCategories: string;
    seeFullRanking: string;
    warmingUp: string;
    byGameHeading: string;
    byGameSubtitle: string;
    /** aria-label of the game-chip list. */
    byGameAria: string;
    /** Chip label, e.g. "Top Minecraft streamers". */
    topGameStreamers(category: string): string;
    whoIsLive: string;
    /** Per-metric section H1s — 'en' byte-identical to RANKING_PAGES h1. */
    metricH1: Record<HubRankingMetric, string>;
    /** Per-metric methodology notes — 'en' byte-identical to RANKING_PAGES. */
    metricNote: Record<HubRankingMetric, string>;
  };
}
