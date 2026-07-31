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
     * Live ticker chip, e.g. "214 streamers live right now · 38 starting in
     * the next 6 hours". Either clause drops when its count is 0; never
     * called with both 0 (the chip is hidden then).
     *
     * UNRENDERED since the masthead rebuild round 2 (2026-07-27) — the live
     * count now heads the Live rail. Kept translated for re-use.
     */
    ticker(liveCount: number, soonCount: number, soonHours: number): string;
    /** "Most Watched right now" rail heading (section rebuild 2026-07-28). */
    liveTitle: string;
    /**
     * Live-rail filter bar. The two dropdowns search the whole rendered pool
     * — every tracked stream that is live — while the unfiltered rail shows
     * only the biggest LIVE_RAIL_DEFAULT_VISIBLE of them. The option labels
     * carry the pool-wide counts, which is what tells the visitor the filters
     * reach further than the visible cut. Language names come from
     * Intl.DisplayNames, not from here.
     *
     * The generic entries below (category/language/option/reset and the "All"
     * labels) are SHARED with the lineup's filter bar — they name a filter
     * dimension, nothing live-specific. Only the strings that say "live" or
     * that the lineup needs on top of them carry a `lineupFilter` prefix.
     */
    liveFilterCategory: string;
    liveFilterLanguage: string;
    liveFilterAllCategories: string;
    liveFilterAllLanguages: string;
    /**
     * Option label with its slot count, e.g. "Just Chatting (7)". Accepts
     * strings so the server can render a `{label}` / `{count}` template for
     * the client island, which recounts on every selection but cannot receive
     * a function across the server/client boundary. Safe to template because
     * nothing here agrees with the number grammatically — it is punctuation
     * around two values.
     */
    liveFilterOption(label: string, count: number | string): string;
    /**
     * Match counter, shown only while a filter is active. Strictly numeric:
     * the wording DOES agree with the count (English singular, Slavic plural
     * categories), so the island receives one pre-rendered string per possible
     * count instead of a template it would have to pluralize itself.
     */
    liveFilterMatches(count: number): string;
    /** Both dropdowns cleared. */
    liveFilterReset: string;
    /** Empty state when a category/language combination matches nothing. */
    liveFilterEmpty: string;
    /**
     * Scope note under the heading, e.g. "Top 30 by current viewers —
     * filters search all 133 live streams". `total` is the searchable pool,
     * which can be slightly below the header's live count (slots without a
     * fresh viewer sample never enter the pool).
     *
     * UNRENDERED since 2026-07-29 — dropped to keep the section compact, the
     * dropdown counts carry the scope now. Kept translated for re-use.
     */
    liveFilterNote(top: number, total: number): string;
    /** "Today's lineup" prediction list heading. */
    upNextTitle: string;
    /** Section link to /live. */
    upNextLink: string;
    /**
     * Lineup filter bar (2026-07-30) — reuses the live rail's generic
     * category/language/option/reset strings and adds the start-time dimension
     * plus its own wording where "live" would be wrong (these are predictions,
     * nothing is running yet).
     *
     * aria-label of the time dropdown.
     */
    lineupFilterTime: string;
    /** Unfiltered time option. */
    lineupFilterAllTimes: string;
    /**
     * One time option. `time` is a clock reading already formatted for the
     * viewer's locale ("8:00 PM" / "20:00"), so this only supplies the
     * cumulative "from" wording — the option matches every start at or after
     * that hour of the visitor's local day.
     */
    lineupFilterFrom(time: string): string;
    /**
     * Match counter, shown only while a filter is active. Agrees with the
     * count like its live-rail sibling, but must NOT say "live" — the cards
     * are predictions for later today.
     */
    lineupFilterMatches(count: number): string;
    /** Empty state when a category/language/time combination matches nothing. */
    lineupFilterEmpty: string;
    /**
     * UNRENDERED since 2026-07-30 — the lineup's category chips became
     * dropdowns, whose unfiltered entry is `liveFilterAllCategories`. Kept
     * translated for re-use.
     */
    chipAll: string;
    /** Locked favorites chip (needs an account). */
    chipFavorites: string;
    /**
     * Expand button under the clamped lineup, e.g. "Show all 24 streams".
     *
     * UNRENDERED since 2026-07-30 — the lineup reveals in batches now, so the
     * button says how many the next click adds (`lineupShowMore`). Kept as the
     * island's fallback label and translated for re-use.
     */
    lineupShowAll(n: number): string;
    /**
     * Reveal button, e.g. "Show 24 more" — `n` is the size of the NEXT batch,
     * which is smaller than LINEUP_REVEAL_STEP for the last one.
     */
    lineupShowMore(n: number): string;
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
    /**
     * Client-side banner for signed-in visitors. UNRENDERED since the
     * masthead rebuild round 2 (2026-07-27): signed-in visitors now start
     * straight at the section nav (SignedOutOnly), and the /feed pointer
     * lives in the header menu + interrupt card. Kept translated for re-use.
     */
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
    /** H1 of the homepage masthead (rebuild round 2, 2026-07-27): one plain
     *  white line, no brand accent fragment. */
    claim: string;
    /** Conversion line under the H1, rendered as
     *  `<a>{ctaLogin}</a>{ctaMid}<a>{ctaApp}</a>{ctaTail}` — every language
     *  therefore has to START the sentence with the sign-in link (all 12 do).
     *  Leading/trailing spaces inside ctaMid/ctaTail are significant. */
    ctaLogin: string;
    ctaMid: string;
    ctaApp: string;
    ctaTail: string;
    /** Same sentence without the sign-in half, for builds where the auth UI
     *  is off (AUTH_UI_VISIBLE=false): `<a>{ctaAppOnlyLink}</a>{ctaAppOnlyTail}`. */
    ctaAppOnlyLink: string;
    ctaAppOnlyTail: string;
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
    /**
     * Sort control over the rail (2026-07-31). Keep the labels SHORT — all
     * four share ONE row on a 390px phone (~334px for the set), and a long
     * translation costs the last button its visibility behind a scroll.
     * A single noun is the target; the superlative ("Most hours") is
     * deliberately dropped, a segmented control already reads as "sort by".
     * Budget-tested in i18n-hub.test.ts.
     * `sortViewers` counts viewers watching the category RIGHT NOW; it must
     * never be attached to `sortHours`, which is time BROADCAST
     * (lib/games-sort.ts invariant). The live-vs-28d distinction is carried by
     * `liveViewers` below, which is what the picked mode renders per tile.
     */
    sortAria: string;
    sortTwitch: string;
    sortHours: string;
    sortViewers: string;
    sortStreamers: string;
    /** Tile metric line in the viewers sort, e.g. "16.3K watching now". */
    liveViewers(value: string): string;
    /**
     * Tile metric line in the streamers sort, e.g. "242 streamers".
     * `value` is the compact-formatted number to render, `count` the raw one —
     * the Slavic locales need it for `pluralForms` (3 стримера / 5 стримеров).
     */
    streamerCount(value: string, count: number): string;
  };
  popular: {
    /** Heading AND aria-label of the popular-streamers discover grid. */
    heading: string;
    viewAll: string;
  };
  /**
   * "Streamer Wiki" card grid at the page bottom (2026-07-31) — the former
   * `popular` pill footer, rebuilt as the app's Discover cards. `heading` is
   * the BRAND term and stays untranslated in every locale, like "Streamer
   * Times" itself; everything else localizes.
   */
  streamerWiki: {
    heading: string;
    /** One-line promise under the heading. */
    subline: string;
    viewAll: string;
    /**
     * The two halves of the stats line ("≈1.6M followers · 20 streams in 28
     * days"), kept atomic so the card can drop either one on its own: a
     * streamer with a NULL follower_count still deserves the activity count
     * instead of a blank line. The caller joins the present halves with " · ".
     * `followers` is the compact-formatted string; `streams` is the raw count,
     * which the Slavic and Arabic locales need for `pluralForms`.
     */
    followers(value: string): string;
    streams28d(count: number): string;
    /** Fact chip while the streamer is broadcasting. */
    liveNow: string;
    /** Fact-chip prefix before the next start time, e.g. "Next: ~ Sat 9:00 PM". */
    nextPrefix: string;
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
    /**
     * Label of the collapsed category jump list, also its nav landmark name.
     * The page runs to dozens of category sections, so it needs a way back to
     * the top-level index without scrolling.
     */
    jumpToGame: string;
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
    /** Footer link to /rankings/climbers (weekly movers recap). */
    climbersThisWeek: string;
    /** Per-metric section H1s — 'en' byte-identical to RANKING_PAGES h1. */
    metricH1: Record<HubRankingMetric, string>;
    /** Per-metric methodology notes — 'en' byte-identical to RANKING_PAGES. */
    metricNote: Record<HubRankingMetric, string>;
  };
}
