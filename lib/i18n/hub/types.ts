// --- Hub-pages UI lexicon type ---------------------------------------------------
//
// Shape of one language's lexicon for the indexable hub-page bodies: home /,
// /live, /streamers, /games (root view) and /rankings (M22 P3), plus the
// programmatic game pages /game/[slug] and /rankings/game/[slug] (M22 P4).
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
    /** Crumb of the /tonight evening guide. */
    tonight: string;
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
    /** M22 S4.1: app QR code on the homepage end cap (AppQrCode props). */
    qrTitle: string;
    qrHeading: string;
    qrHint: string;
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
    /**
     * Section link to /live.
     *
     * UNRENDERED since 2026-08-05: the section's action link points at
     * /tonight now (`upNextTonightLink`). The evening guide is the natural
     * continuation of a 24-hour line-up, where /live answers a different
     * question — and the label said "Live & starting soon", so the href could
     * not move without it. Kept translated for re-use.
     */
    upNextLink: string;
    /**
     * Section link to /tonight — the same line-up, organised by time of
     * evening. Carries its own arrow like the sibling above, because RTL
     * locales need '←': it belongs in the string and is never appended by the
     * component.
     */
    upNextTonightLink: string;
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
    /**
     * Match counter beside the clips rail's dropdowns, e.g. "141 clips". The
     * category/language labels and the reset button are shared with the live
     * rail (`liveFilter*`) — only the noun differs, so only the noun is a key
     * of its own.
     */
    clipsFilterMatches(count: number): string;
    clipsFilterEmpty: string;
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
    /**
     * Section expansion 2026-08-01. Big values are rendered by the component
     * (a duration, a clock reading, a weekday, a count), so these are the
     * sentences underneath. Category and streamer names stay untranslated.
     */
    factMarathonLabel: string;
    /** The category, when known, is shown separately — do not ask for it here. */
    factMarathon(name: string): string;
    factComebackLabel: string;
    /** Agrees with the day count; `days` is always >= 14. */
    factComeback(name: string, days: number): string;
    factPrimeTimeLabel: string;
    /**
     * `total` is a pre-formatted session count ("7.6K"). Big value is the hour
     * itself, which depends on the viewer's timezone — keep every number that
     * the timezone would change OUT of this sentence.
     */
    factPrimeTime(total: string): string;
    factBusiestDayLabel: string;
    /** Same contract as factPrimeTime; big value is the weekday name. */
    factBusiestDay(total: string): string;
    /** Suffix marking a timezone-dependent value, e.g. "your local time". */
    factLocalTimeNote: string;
    /** Its pre-hydration counterpart — the server can only render UTC. */
    factUtcNote: string;
    factTopCategoryLabel: string;
    /** Big value is the session count; `streamers` agrees grammatically. */
    factTopCategory(category: string, streamers: number): string;
    factCompetitionLabel: string;
    /** Big value is the average number of concurrently live tracked channels. */
    factCompetition(category: string): string;
    factRoomLabel: string;
    /**
     * Big value is viewers per channel. `channels` is pre-formatted ("2.1") —
     * a decimal that no language pluralizes, so it travels as a string.
     */
    factRoom(category: string, channels: string): string;
    /** Label of the best-slot line, rendered as "{label}: Fri 11 PM". */
    factRoomSlotLabel: string;
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
  /**
   * /tonight — the evening-intention hub ("who is streaming tonight"), the
   * streaming answer to a TV magazine's "TV-Programm heute 20:15". Sibling of
   * `live`, which answers "right now".
   *
   * TIME WORDING RULE: every string here describes an evening in the LOCALE's
   * reference zone (lib/tonight/logic.ts `TONIGHT_REFERENCE_ZONES`), and the
   * client relabels the clock readings into the viewer's own zone after
   * hydration. So never hard-code a clock time into a sentence — always take
   * it as a parameter, or the German 20:15 would survive into a translation
   * whose readers see a different number.
   */
  tonight: {
    /** H1 while the page previews the coming or current evening. */
    h1: string;
    /** H1 after midnight, when the evening's night is still running. */
    h1Night: string;
    /**
     * Full intro sentence. `names` is a ready-made prose list of the evening's
     * biggest streamers ("A, B and C") or '' when none are known — the naming
     * clause must drop entirely in that case. `total` counts every listed
     * stream. Only called with total > 0.
     */
    intro(total: number, names: string): string;
    /** Intro when nothing is listed for the evening. */
    introEmpty: string;
    /**
     * Note under the dateline, e.g. "All times CEST". `zone` is a short zone
     * name from Intl ("CEST", "GMT+9") — never translate or inflect it.
     */
    timesInZone(zone: string): string;
    /** Its post-hydration counterpart, once the viewer's own zone is known. */
    timesLocal: string;
    error: string;
    /** aria-label of the section jump nav. */
    jumpAria: string;
    /** Heading + jump chip of the "already running" opener. */
    liveNowHeading: string;
    /** Link from that section to the full /live hub. */
    liveNowLink: string;
    /** Heading of the prime-time highlight box. */
    primetimeHeading: string;
    /** Line under it; `time` is a clock reading ("8:15 PM" / "20:15"). */
    primetimeSub(time: string): string;
    /** Block heading built from a clock reading, e.g. "From 8:00 PM". */
    blockFrom(time: string): string;
    /** Heading of the 00:00–06:00 block — a word, not a clock reading. */
    blockNight: string;
    /** Count chip next to a block heading, e.g. "12 streams". */
    blockCount(n: number): string;
    /** Shown instead of the listing when the evening is empty. */
    quietBody: string;
    /** Evergreen explainer, so a quiet evening still has substance. */
    aboutHeading: string;
    aboutBody: string;
    faqWhatQ: string;
    faqWhatA: string;
    faqHowQ: string;
    faqHowA: string;
    faqTimesQ: string;
    /** `zone` is the same short zone name as `timesInZone`. */
    faqTimesA(zone: string): string;
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
    seeFullRanking: string;
    warmingUp: string;
    /**
     * States of the filterable Top-5 previews (2026-08-08). The dropdown
     * chrome itself is shared verbatim with the homepage filters
     * (`homeFeed.liveFilter*`) and the match counter reuses
     * `gameChips.streamersLabel`, so only what is specific to a FETCHED
     * preview lives here. The link out of a category selection reuses
     * `game.seeFullRanking` — same destination, same wording.
     */
    /** Selection has no match in this ranking's pool (dropdowns prevent it). */
    filterEmpty: string;
    /** The filtered preview could not be loaded. */
    filterError: string;
    /** Retry button next to filterError. */
    filterRetry: string;
    byGameHeading: string;
    byGameSubtitle: string;
    /** aria-label of the game-chip list. */
    byGameAria: string;
    /** Chip label, e.g. "Top Minecraft streamers". */
    topGameStreamers(category: string): string;
    /**
     * Alternate chip label ("Minecraft streamer stats") used for every third
     * game chip — varies the anchor texts (SEO round 2026-08-11) instead of 24
     * identically patterned links, and carries the "stats" keyword.
     */
    gameChipStats(category: string): string;
    whoIsLive: string;
    /** Footer link to /rankings/climbers (weekly movers recap). */
    climbersThisWeek: string;
    /** Per-metric section H1s — 'en' byte-identical to RANKING_PAGES h1. */
    metricH1: Record<HubRankingMetric, string>;
    /** Per-metric methodology notes — 'en' byte-identical to RANKING_PAGES. */
    metricNote: Record<HubRankingMetric, string>;
    /**
     * M22 S4.1: RankingTable chrome (server component — reads the lexicon
     * directly via its `locale` prop). The value columns keep their English
     * number formatting (compact "21.4M" etc., registry-owned) — headers and
     * titles localize, values are numbers.
     */
    tableColStreamer: string;
    tableColMainGame: string;
    tableColNextStream: string;
    /**
     * Metric-column headers keyed by the REGISTRY's English header string
     * (lib/rankings.ts) — a key the map misses falls back to the English
     * header, so a future registry column degrades instead of crashing.
     */
    tableHeaders: Record<string, string>;
    /** "new" badge next to the rank for first-time entries. */
    trendNewLabel: string;
    trendNewTitle: string;
    /** title of the ▲/▼ movement badge, e.g. "Up 2 since last week". */
    trendMoveTitle(up: boolean, delta: number): string;
    /** title of the "Main game" cell, e.g. "62% of their categorized streams". */
    mainGameShareTitle(pct: number): string;
    /** title of the "24/7" next-stream cell. */
    alwaysOnTitle: string;
    /**
     * Visible Q&A block at the bottom of the hub (SEO round 2026-08-11) —
     * targets informational queries ("how are streamer rankings calculated",
     * "twitch stats"). Plain content, deliberately no FAQPage JSON-LD (same
     * decision as the metric pages: Google restricted FAQ rich results to
     * gov/health sites in 2023 — the copy itself is the SEO value).
     */
    faqHeading: string;
    faqCalculatedQ: string;
    faqCalculatedA: string;
    faqUpdatedQ: string;
    faqUpdatedA: string;
    faqPlatformsQ: string;
    faqPlatformsA: string;
  };
  /**
   * AI recap articles (2026-08-09): the two teaser cards atop /rankings, the
   * /rankings/recap archive and the article pages. Card/page CHROME only —
   * the article text itself is content served per-locale by the partner API.
   */
  recaps: {
    /** <title> suffix on recap pages carrying the head keywords people
     *  actually search (Google Trends 2026-08: "twitch", "streamer",
     *  "stats"), e.g. "Twitch & YouTube Streamer Stats". Metadata only —
     *  never rendered on the page. */
    metaTitleSuffix: string;
    /** Card kicker of the weekly edition, e.g. "Weekly recap". */
    weeklyKicker: string;
    monthlyKicker: string;
    /** Card + archive link into an edition, e.g. "Read the full recap". */
    readMore: string;
    /** /rankings/recap archive page h1. */
    archiveTitle: string;
    archiveIntro: string;
    /** Link label to the archive (hub + article footer). */
    allRecaps: string;
    /** Article-footer link back to /rankings. */
    backToRankings: string;
    /** Older / newer edition of the same cadence (article footer). */
    previousEdition: string;
    nextEdition: string;
    /** Note shown when the viewer's locale has no translation yet (English
     *  original is served; that variant is noindexed). */
    translationPending: string;
  };
  /**
   * M22 S4.1: /games catalog explorer (client component — the server page
   * resolves these and passes them as props; {q} templates are interpolated
   * client-side). sortLabels keys match GamesSortMode.
   */
  gamesExplorer: {
    /** aria-label of the catalog section. */
    sectionAria: string;
    /** aria-label of the sort-view switcher nav. */
    sortAria: string;
    sortLabels: { streamers: string; hours: string; trending: string };
    /**
     * Full view titles for the sibling-hub links under the catalog — 'en'
     * byte-identical to GAMES_HUB_VIEWS h1 (vitest-pinned).
     */
    viewTitles: { streamers: string; hours: string; trending: string };
    /** Keep the … ellipsis character in every language. */
    searchPlaceholder: string;
    searchAria: string;
    /** Empty state; {q} is replaced client-side with the query. */
    noMatch: string;
  };
  /**
   * Stats chips shared VERBATIM by /game/[slug] and /rankings/game/[slug]
   * (M22 P4). The numeric value renders in its own bold <span>, so each chip
   * splits into label parts around it; lead/tail strings carry their own
   * significant leading/trailing spaces (hero.titleLead precedent). Category
   * names are proper nouns — never translated, never inflected.
   */
  gameChips: {
    /** aria-label of the chip list, e.g. "Fortnite statistics". */
    aria(category: string): string;
    /** After the bold count: "streamer" / "streamers" (pluralized). */
    streamersLabel(n: number): string;
    /** After the bold live count: "live now". */
    liveNowLabel: string;
    /** After the bold viewer total: "watching". */
    watchingLabel: string;
    /** After the bold "{X}h": "streamed / 28d". */
    streamedLabel: string;
    /** After the bold count: "streams / 28d" (pluralized). */
    streamsLabel(n: number): string;
    /** Around the bold peak-viewer number: "Peak " … " viewers / 28d". */
    peakLead: string;
    peakTail: string;
    /** After "▲ {x}%": " this week" (leading space significant). */
    trendTail: string;
    /** title attribute of the trend chip. */
    trendTitle: string;
  };
  /**
   * /game/[slug] hub body + metadata (M22 P4). All functions return COMPLETE
   * interpolated strings — never fragments that JSX would join as adjacent
   * text nodes (the "VALORANTstreamers" bug class). 'en' entries are
   * byte-identical to the previously inline strings.
   */
  game: {
    // --- generateMetadata ---
    notFoundTitle: string;
    metaTitle(category: string): string;
    /**
     * Richest-first description variants for pickMetaDescription: 3-name
     * lead → 2-name lead → nameless "most followed" sentence → bare tail.
     * `names` are the visible ranking's top names in table order; the entry
     * formats its own prose list (en: formatNameList, others:
     * listConjunction) and its own verb agreement.
     */
    metaDescription(category: string, names: string[]): string[];
    ogTitle(category: string): string;
    /** OG/Twitter description; names joined em-dash style when present. */
    ogDescription(category: string, names: string[]): string;
    // --- hero ---
    h1(category: string): string;
    /**
     * Full intro: "{shown} streamers have {cat} streams live or scheduled
     * this week on Twitch and YouTube. {live} are live right now, with
     * {upcoming} upcoming streams in the next 7 days." Clauses drop at 0
     * (live clause becomes "None are live right now"); `superlative` is the
     * pre-rendered sentence below or '' and is appended verbatim.
     */
    intro(
      shown: number,
      category: string,
      liveCount: number,
      upcomingCount: number,
      superlative: string,
    ): string;
    /** " The most-followed {cat} streamer here is {name} with {value} followers."
     *  Leading space significant (appended to the intro). `value` is the
     *  locale-formatted compact number; `isTwitch` picks followers/subscribers. */
    superlative(category: string, name: string, value: string, isTwitch: boolean): string;
    // --- on-this-page nav ---
    onPageAria: string;
    navLiveNow: string;
    navTopStreamers: string;
    navBestTimes: string;
    navSchedule: string;
    navRelated: string;
    /** "Follow {category}" chip (auth-gated FollowGameButton). */
    followGame(category: string): string;
    followingLabel: string;
    // --- live section ---
    watchingNow(category: string): string;
    liveStreamsAria(category: string): string;
    moreLiveAria(category: string): string;
    showMoreLive(n: number): string;
    moreLiveInRanking(n: number, category: string): string;
    liveUpdatesNote: string;
    // --- most-followed table ---
    mostFollowed(category: string): string;
    tableCaption(category: string): string;
    thRank: string;
    thStreamer: string;
    thNextStream: string;
    thFollowers: string;
    /** "Hours / 28d" — deliberately distinct from the explorer's "Hours (28d)". */
    thHours: string;
    liveNowCell: string;
    seeFullRanking(category: string): string;
    // --- roster fallback (doubles as the ItemList JSON-LD name) ---
    whoStreams(category: string): string;
    // --- heatmap section (client props are placeholder TEMPLATES: the peak
    //     value only exists after the client-side timezone shift) ---
    whenStreamed(category: string): string;
    /** Template with {peak} (bold-rendered by the component) and {tz}. */
    heatmapSummary(category: string): string;
    heatmapSummaryEmpty: string;
    /** {tz} replacements, leading space significant: " (your local time)". */
    tzLocalSuffix: string;
    tzUtcSuffix: string;
    /** role=img aria labels; the "with peak" form is a template with {peak}. */
    heatmapAria(category: string): string;
    heatmapAriaWithPeak(category: string): string;
    /** Cell tooltip template: "{day} {from}–{to} · {amount} streamed in 4 weeks". */
    heatmapTooltip: string;
    legendLess: string;
    legendMore: string;
    /**
     * Plural weekday names for the peak-band label ("Mondays 19:00–23:00"),
     * ISO order Mon..Sun. Kept in the lexicon because several languages use
     * an adverbial form ("montags") Intl cannot produce.
     */
    heatmapDayNames: [string, string, string, string, string, string, string];
    // --- best-time section (M24 preview) ---
    bestTimeToStream(category: string): string;
    trendingBadge: string;
    bestTimeIntro(category: string): string;
    fullHeatmapLink: string;
    bestSlotsAria: string;
    /** Template: "~{score} viewers/channel". */
    viewersPerChannel: string;
    timesLocalNote: string;
    timesUtcNote: string;
    // --- quiet empty state ---
    quietTitle(category: string): string;
    quietBody(category: string): string;
    quietMeanwhile: string;
    seeWhosLive: string;
    browseAllGames: string;
    /** Related-games chip label, e.g. "Fortnite streamers". */
    gameStreamersChip(category: string): string;
    // --- schedule section ---
    scheduleAria(category: string): string;
    upcomingStreams(category: string): string;
    scheduleNote: string;
    filterAria: string;
    allPlatforms: string;
    hideLowConfidence: string;
    /** GameDaySection (server component — reads the lexicon directly). */
    moreLowConfidence(n: number): string;
    lowConfAria(label: string): string;
    hiddenNotShown(n: number): string;
    // --- related games ---
    relatedGames: string;
    relatedGamesAria: string;
    relatedNote: string;
    // --- footer ---
    allGamesFooter: string;
  };
  /**
   * /rankings/game/[slug] body + metadata (M22 P4). Same authoring rules as
   * `game`; the interactive explorer receives these as server-resolved props.
   */
  gameRanking: {
    // --- generateMetadata ---
    notFoundTitle: string;
    metaTitle(category: string, page: number): string;
    /** "{name} leads with {value} followers. " — trailing space significant. */
    metaLeadIn(name: string, value: string): string;
    /** Richest-first variants for pickMetaDescription; leadIn may be ''. */
    metaDescription(category: string, leadIn: string): string[];
    ogTitle(category: string): string;
    // --- hero ---
    h1(category: string): string;
    introPage1(count: number, category: string): string;
    /** " {name} tops the list with {value} followers." — leading space significant. */
    topsTheList(name: string, value: string, isTwitch: boolean): string;
    introPageN(from: number, to: number, total: number, category: string): string;
    // --- methodology / freshness ---
    methodology(category: string): string;
    /** " Follower counts refreshed {label}." — leading space significant. */
    followersRefreshed(label: string): string;
    warmingUp: string;
    missingDataNote: string;
    // --- explorer (client props) ---
    sortAria: string;
    sortFollowers: string;
    sortHours: string;
    sortViewers: string;
    filterLangAria: string;
    allChip: string;
    noMatch: string;
    tableCaption(category: string): string;
    thRank: string;
    thStreamer: string;
    thFollowers: string;
    thAvgViewers: string;
    thHours: string;
    thShare: string;
    thShareTitle(category: string): string;
    thNextStream: string;
    liveNowCell: string;
    /** Template appended after liveNowCell: " · {value} watching". */
    watchingTail: string;
    trendNewBadge: string;
    trendNewTitle: string;
    /** Templates with {n}: "Up {n} since last week". */
    trendUpTemplate: string;
    trendDownTemplate: string;
    /** Template: "Main game: {share}% of their recent broadcasts". */
    mainGameTemplate: string;
    // --- FAQ ("About this ranking") ---
    aboutRanking: string;
    faqMostFollowedQ(category: string): string;
    faqMostFollowedA(
      category: string,
      top: { name: string; value: string; isTwitch: boolean },
      second: { name: string; value: string } | null,
    ): string;
    faqHowManyQ(category: string): string;
    faqHowManyA(
      category: string,
      count: number,
      activity: { hours: string; streams: string } | null,
    ): string;
    faqMeasuredQ: string;
    faqMeasuredA(category: string): string;
    faqShareQ: string;
    faqShareA(category: string): string;
    // --- related / footer / pagination ---
    relatedRankings: string;
    relatedRankingsAria: string;
    liveAndSchedule(category: string): string;
    allRankings: string;
    paginationAria(category: string): string;
    prev: string;
    next: string;
  };
}
