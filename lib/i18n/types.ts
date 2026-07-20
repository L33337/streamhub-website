// --- Streamer-page UI lexicon type ---------------------------------------------
//
// Shape of one language's lexicon for the streamer detail page body (server
// components only — the client-shared strings live in lib/i18n-slot.ts).
// `Record<UiLang, UiLex>` in lib/i18n-ui.ts turns this interface into a
// compile-time completeness check: a missing key in any language fails
// `next build`.
//
// Authoring rules (see lib/i18n-slot.ts header for the full register spec):
// informal streaming tone (de du-form, fr tu-form, ja です/ます); brands,
// game/category names and "UTC" untranslated; no naive English possessives —
// every language phrases name references grammatically on its own.

export interface UiLex {
  breadcrumb: {
    /** JSON-LD-only "Home" crumb. */
    home: string;
    /** Visible breadcrumb link + matching BreadcrumbList name. */
    streamers: string;
  };
  hero: {
    featured: string;
    /** Label before the (native-language) live stream title. */
    nowStreaming: string;
    avatarAlt(name: string): string;
  };
  promo: {
    valueProps: [string, string, string];
    qrAria: string;
    getApp: string;
  };
  lastStream: {
    heading: string;
    /** Fallback title for an untitled past broadcast. */
    pastStream: string;
    watchVod: string;
    watchAria(name: string, title: string): string;
  };
  recent: {
    heading: string;
    vodAria(title: string): string;
  };
  channelStats: {
    heading: string;
    followers: string;
    subscribers: string;
    avgViewers: string;
    /** Detail line under "Avg viewers" — the backend median window is fixed at 28 days. */
    medianDetail: string;
    peakViewers: string;
    hoursStreamed: string;
    lastNDays(n: number): string;
  };
  /** "Rankings" block inside Channel stats — where this streamer places. */
  streamerRankings: {
    heading: string;
    intro(name: string): string;
    /** Denominator line under a placement, e.g. "of 236 streamers". */
    ofTotal(total: string): string;
    /** Leaderboard labels; keys match RankingMetric. */
    metric: {
      'most-followed': string;
      'most-watched': string;
      'most-active': string;
      'most-reliable': string;
      'fastest-growing': string;
    };
    /** Accessible name of a placement link, e.g. "#3 of 236 in Most followed". */
    rowAria(rank: number, total: string, label: string): string;
    /** Screen-reader text for the trend arrows (delta is always >= 1). */
    trendUp(places: number): string;
    trendDown(places: number): string;
    /** Grouping label above the per-category placements. */
    byCategory: string;
    /** Meta-description sentence, parts like ["#3 Most followed", "#1 Minecraft"]. */
    summary(name: string, parts: string[]): string;
  };
  stats: {
    heading(name: string): string;
    /** sr-only <caption> of the weekday table. */
    caption(name: string, tzLabel: string): string;
    colDay: string;
    colTime: string;
    colDuration: string;
    usuallyNoStream: string;
    streamsPerWeek: string;
    typicalLength: string;
    topCategories: string;
    /** First footer sentence, ends with its own period. */
    basedOn(sampleSize: number, windowDays: number): string;
    /** Second footer sentence WITHOUT trailing period — the component appends an optional " (IANA)" + ".". */
    allTimesIn(tzLabel: string): string;
    /** "{city} time" zone label; "UTC" stays literal in the caller. */
    cityTime(city: string): string;
    /** Lead sentence; `times` is null when no typical start/end range exists. */
    leadSentence(
      name: string,
      days: number,
      times: { start: string; end: string; tzLabel: string } | null,
    ): string;
  };
  faq: {
    heading: string;
    qIsLive(name: string): string;
    aIsLiveCat(name: string, cat: string, platforms: string): string;
    aIsLive(name: string, platforms: string): string;
    qUsually(name: string): string;
    /** Appended sentence: "Streams typically last around {duration}." */
    typicallyLast(duration: string): string;
    qSchedule(name: string): string;
    aScheduleLead(name: string, n: number): string;
    nextUp(entry: string): string;
    afterThat(list: string): string;
    plusMore(n: number): string;
    /**
     * Standalone sentence declaring the zone of the schedule-entry times:
     * "All times are Berlin time." `tzLabel` is the localized stats.cityTime
     * label. Only rendered when entries are streamer-local (not UTC).
     */
    allTimesNote(tzLabel: string): string;
    predictedNote: string;
    outsideDates(name: string, time: string, tz: string): string;
    /** Marker inside schedule entries: "(Just Chatting, predicted)". */
    predictedMarker: string;
    qGames(name: string): string;
    aGamesOne(name: string, cat: string): string;
    aGamesMany(name: string, list: string): string;
    qHowOften(name: string): string;
    aAlwaysOn(name: string, platforms: string): string;
    aPerWeek(name: string, perWeek: number, windowDays: number): string;
    /** Fallback frequency answer; daysList is a pre-joined localized weekday list or null. */
    aScheduleCount(name: string, n: number, daysList: string | null): string;
    qWhere(name: string): string;
    aWhere(name: string, platforms: string): string;
    qTimezone(name: string): string;
    aTimezone(name: string, tzCity: string): string;
    qPredicted(name: string): string;
    aAllPredicted(name: string): string;
    aMixed(name: string, predicted: number, total: number): string;
  };
  empty: {
    heading: string;
    body(name: string, platforms: string): string;
    browseAll: string;
  };
  related: {
    heading: string;
    liveNowSr: string;
  };
  games: {
    heading: string;
    navAria: string;
  };
}
