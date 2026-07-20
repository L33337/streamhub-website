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
