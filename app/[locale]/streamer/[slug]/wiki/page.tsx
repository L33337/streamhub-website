// M26 streamer wiki: /streamer/[slug]/wiki — AI-researched encyclopedic
// profile (sourced infobox + article). Unlike /insights this page is
// INDEXABLE: it exists only when a published wiki profile exists (the
// substance gate is the 404), and the locale gate is the same per-streamer
// pair as the parent page (en + the streamer's own language — exactly the
// two languages the article content exists in).
//
// Language axes (M22 D6): UI chrome (labels, headings, disclaimer) follows
// the VIEWER locale via the UiLex `wiki` section; the article body is
// CONTENT (EN source / native translation, picked by pickWikiArticle and
// rendered with its own lang/dir). Fact values arrive language-neutral and
// are formatted per viewer locale (lib/wiki.ts).
//
// W1/W2 (2026-09-18): own openGraph/twitter block + canonical (the page used
// to inherit the homepage's og:url), fact-derived title parts, earnings
// fallback, sticky-infobox height cap, and the own-measurement sections
// (numbers, viewer heatmap, games table, clips, recap mentions, related
// streamers) — all best-effort and byte-deterministic (absolute dates only).

import { cache, Fragment, type ReactNode } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import {
  getPartnerApi,
  type PublicGame,
  type PublicRecapListItem,
  type PublicStreamer,
  type PublicStreamerClip,
  type PublicStreamerRankings,
  type PublicStreamerStats,
  type PublicStreamerWiki,
  type PublicStreamHistory,
  type PublicStreamSlot,
  type StreamerInsights,
  type WikiChange,
  type WikiChangeValue,
  type WikiFact,
} from '@/lib/server/partner-api';
import { historyVodLinks, usableThumbnail } from '@/lib/history';
import { pickNextRealSlot, sevenDayKeys } from '@/lib/format/time';
import { floorToBucket } from '@/lib/home/logic';
import { HeroNextStream } from '@/components/web/HeroNextStream';
import { LiveBadge } from '@/components/web/Badges';
import { FavoriteButton } from '@/components/web/FavoriteButton';
import { WatchButtons } from '@/components/web/WatchButtons';
import { InsightsCharts } from '@/components/web/streamer/InsightsCharts';
import { FollowerGrowthChart } from '@/components/web/streamer/InsightsTrendCharts';
import { RelatedStreamers } from '@/components/web/RelatedStreamers';
import {
  applyLocaleSeo,
  buildBreadcrumbJsonLd,
  buildPersonJsonLd,
  absoluteLocaleUrl,
  dirFor,
  isIndexableStreamerSlug,
  jsonLdHtml,
  langToLocale,
  pickDescription,
  streamerIndexableLocales,
} from '@/lib/seo';
import { isUiLang, localeHref, type UiLang } from '@/lib/i18n-core';
import { sizedCdnImageUrl } from '@/lib/format/image-size';
import { formatCompactNumber, formatStatValue } from '@/lib/format/number';
import { uiLexFor, type UiLex } from '@/lib/i18n-ui';
import { buildStreamerRankingRows } from '@/lib/streamer-rankings';
import { COLLECTING_THRESHOLD, followerStats, usableCells } from '@/lib/streamer-insights';
import {
  articleSegments,
  avatarLargeUrl,
  bannerDisplayUrl,
  displayAge,
  formatBirthDate,
  formatFactAsOf,
  formatSourceDate,
  gameLinkTargets,
  formatHours,
  formatRegion,
  formatSharePercent,
  formatUsdRange,
  formatWikiDate,
  formatHistoryMonth,
  formatSignedInt,
  formatTimelineDate,
  formatWholeNumber,
  formatWikiShortDate,
  groupChangesByDay,
  groupHistoryByYear,
  historyParagraph,
  incomeFact,
  joinTitleParts,
  laterIso,
  latestHistoryIso,
  linkGameMentions,
  orderedWikiFacts,
  pickWikiArticle,
  weekdayShortLabels,
  wikiChanges,
  wikiGamesTable,
  wikiHistory,
  wikiLinkLabel,
  wikiLinks,
  wikiMetaDescription,
  wikiNotableClips,
  wikiNumbers,
  wikiRecapMentions,
  wikiTimeline,
  wikiTitleParts,
  type ArticleSegment,
  type ProseSegment,
  type WikiHistoryYear,
} from '@/lib/wiki';

export const revalidate = 3600;

const CONTACT_EMAIL = 'StreamHub.Privacy@icloud.com';
const BRAND_SUFFIX = ' | Streamer Times';
const CLIPS_LIMIT = 6;
const GAMES_LIMIT = 8;
const RECAPS_LIMIT = 6;
/** Schedule-reliability tier needs this many scored announcements to show. */
const RELIABILITY_MIN_SAMPLE = 5;

interface Props {
  params: Promise<{ locale: string; slug: string }>;
}

interface WikiPageData {
  streamer: PublicStreamer | null;
  wiki: PublicStreamerWiki | null;
  stats: PublicStreamerStats | null;
  games: PublicGame[];
  lastStream: PublicStreamHistory | null;
  upcomingSlots: PublicStreamSlot[];
  insights: StreamerInsights | null;
  rankings: PublicStreamerRankings | null;
  clips: PublicStreamerClip[];
  recaps: PublicRecapListItem[];
}

// streamer+wiki gate the page (no profile = 404); everything else is
// best-effort — a failing lookup must never 404 a live wiki page. Explicit
// revalidate ≥ the route value on EVERY fetch so no call drags the ISR window
// down (Next min() rule; listRecaps defaults to 900, RelatedStreamers to
// 1800 — both are overridden below). The schedule window mirrors the
// streamer page (bucketed now → +7d, predictions + always-on included) so
// both surfaces name the same "next stream", but limit differs on purpose: a
// distinct fetch URL keeps this call on ITS OWN data-cache entry with
// revalidate 3600 — sharing the profile page's entry would inherit its 1800
// and halve the wiki ISR window.
const loadWikiPage = cache(async (slug: string): Promise<WikiPageData> => {
  const api = getPartnerApi();
  const bucketedNow = floorToBucket(new Date());
  const sevenDaysFromNow = new Date(bucketedNow.getTime() + 7 * 86_400_000);
  const [streamer, wiki, stats, games, lastStream, upcomingSlots, insights, rankings, clips, recaps] =
    await Promise.all([
      api.getStreamer(slug, { revalidate: 3600 }).catch(() => null),
      api.getStreamerWiki(slug, { revalidate: 3600 }),
      api.getStreamerStats(slug, { revalidate: 3600 }),
      api
        .listGames({ limit: 500, revalidate: 3600 })
        .then((r) => r.data)
        .catch(() => [] as PublicGame[]),
      api.getLastStream(slug, { revalidate: 3600 }),
      api
        .listSchedules({
          streamerIds: [slug],
          status: ['upcoming'],
          includePredictions: true,
          includeAlwaysOn: true,
          from: bucketedNow.toISOString(),
          to: sevenDaysFromNow.toISOString(),
          limit: 50,
          revalidate: 3600,
        })
        .then(
          (page) => page.data,
          () => [] as PublicStreamSlot[],
        ),
      api.getStreamerInsights(slug, { revalidate: 3600 }),
      api.getStreamerRankings(slug, { revalidate: 3600 }),
      api.getStreamerClips(slug, { limit: CLIPS_LIMIT, revalidate: 3600 }),
      api
        .listRecaps({ limit: 50, revalidate: 3600 })
        .then((r) => r.data)
        .catch(() => [] as PublicRecapListItem[]),
    ]);
  return { streamer, wiki, stats, games, lastStream, upcomingSlots, insights, rankings, clips, recaps };
});

export async function generateStaticParams() {
  // ISR-K1: SSG mode; variants render on demand.
  return [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale: UiLang = isUiLang(rawLocale) ? rawLocale : 'en';
  const { streamer, wiki } = await loadWikiPage(slug);
  if (!streamer || !wiki) return { title: `Streamer not found${BRAND_SUFFIX}` };

  const L = uiLexFor(locale);
  const { article, lang: articleLang } = pickWikiArticle(wiki, locale);
  // Year from generated_at, not from the clock: the title only changes when
  // the profile actually changes (ISR byte-determinism), and it is honest —
  // the facts ARE from that year.
  const year = (wiki.refreshed_at ?? wiki.generated_at).slice(0, 4);
  // Title parts name only what the infobox actually holds (W1).
  const parts = wikiTitleParts(wiki.facts).map((p) => L.wiki.titlePart[p]);
  const titleCore = L.wiki.metaTitle(
    streamer.name,
    year,
    joinTitleParts(parts, L.wiki.titleSep, L.wiki.titleAnd),
  );
  const description = wikiMetaDescription(article.summary);
  const path = `/streamer/${encodeURIComponent(slug)}/wiki`;
  const url = absoluteLocaleUrl(locale, path);
  const meta: Metadata = {
    title: `${titleCore}${BRAND_SUFFIX}`,
    description,
    // Explicit canonical on EVERY variant: applyLocaleSeo passes an English
    // single-locale page through untouched, which used to leave the wiki of
    // an English-language streamer without one (and `?utm=` duplicates open).
    alternates: { canonical: url },
    // Own og/twitter block: without it the page inherits the root layout's
    // (og:url = homepage), so every shared wiki link unfurled as the site
    // card. og:locale = the language of the summary shown (content axis);
    // applyLocaleSeo overrides it for the localized-class variants.
    openGraph: {
      title: titleCore,
      description,
      url,
      type: 'profile',
      siteName: 'Streamer Times',
      locale: langToLocale(articleLang),
    },
    twitter: {
      card: 'summary_large_image',
      title: titleCore,
      description,
    },
  };
  if (!isIndexableStreamerSlug(slug)) {
    meta.robots = { index: false, follow: true };
  }
  return applyLocaleSeo(meta, locale, path, streamerIndexableLocales(streamer.language));
}

// ============================================
// Fact value rendering (locale-aware)
// ============================================

function factValue(fact: WikiFact, locale: UiLang, L: UiLex, now: Date, withAge = true): string {
  switch (fact.key) {
    case 'birth_date': {
      const base = formatBirthDate(fact.value, locale);
      const age = withAge ? displayAge(fact.value, now) : null;
      return age !== null ? `${base} (${L.wiki.ageSuffix(age)})` : base;
    }
    case 'nationality':
      return formatRegion(fact.value, locale);
    case 'relationship_status': {
      const rel = L.wiki.relationship[fact.value as keyof UiLex['wiki']['relationship']];
      return rel ?? fact.value;
    }
    case 'net_worth_usd':
    case 'est_income_monthly_usd':
      return fact.value_num_low !== null
        ? formatUsdRange(fact.value_num_low, fact.value_num_high, locale)
        : fact.value;
    case 'height_cm':
      return fact.value_num_low !== null ? `${fact.value_num_low} cm` : fact.value;
    default:
      return fact.value;
  }
}

// ============================================
// Change log (W5, 2026-09-18)
// ============================================

/** A change-value snapshot rendered exactly like the infobox value (no age
 *  suffix: a change line names the date, not the person's current age). */
function changeValueText(key: string, v: WikiChangeValue, locale: UiLang, L: UiLex, now: Date): string {
  const pseudo: WikiFact = {
    key,
    value: v.value,
    value_num_low: v.value_num_low,
    value_num_high: v.value_num_high,
    is_estimate: false,
    as_of: v.as_of,
    source_ids: [],
  };
  return factValue(pseudo, locale, L, now, false);
}

function factLabelText(key: string, L: UiLex): string {
  return L.wiki.factLabel[key as keyof UiLex['wiki']['factLabel']] ?? key;
}

function sectionLabelText(key: string, L: UiLex): string {
  const W = L.wiki;
  const map: Record<string, string> = {
    summary: W.sectionSummary,
    career: W.sectionCareer,
    content_style: W.sectionContentStyle,
    community: W.sectionCommunity,
    awards: W.sectionAwards,
    personal_life: W.sectionPersonalLife,
    earnings: W.sectionEarnings,
    timeline: W.timelineHeading,
    links: W.linksLabel,
  };
  return map[key] ?? key;
}

/** One human-readable line per change entry; null for a kind this build
 *  does not know (the API's kind set may grow). */
function changeLine(c: WikiChange, locale: UiLang, L: UiLex, now: Date): string | null {
  const label = factLabelText(c.key, L);
  const oldText = c.old_value ? changeValueText(c.key, c.old_value, locale, L, now) : null;
  const newText = c.new_value ? changeValueText(c.key, c.new_value, locale, L, now) : null;
  switch (c.kind) {
    case 'fact_added':
      return newText ? L.wiki.changeAdded(label, newText) : null;
    case 'fact_changed':
      return oldText && newText ? L.wiki.changeChanged(label, oldText, newText) : null;
    case 'fact_removed':
      return L.wiki.changeRemoved(label);
    case 'income_refreshed':
      if (!newText) return L.wiki.changeIncomeRemoved;
      return oldText ? L.wiki.changeIncomeRefreshed(oldText, newText) : L.wiki.changeAdded(label, newText);
    default:
      return null;
  }
}

/**
 * Sup footnote link, shared by infobox facts and article paragraphs. The
 * visible glyph stays small; the padding + negative margins give it a 24 px
 * hit area without growing the line box (WCAG 2.5.8 target size).
 */
function FootnoteRef({ n }: { n: number }) {
  return (
    <sup className="ml-0.5">
      <a
        href={`#wiki-source-${n}`}
        className="-my-1.5 -mx-0.5 inline-block px-1 py-1.5 font-mono text-[11px] leading-[1.2] text-accent-cyan hover:underline"
      >
        [{n}]
      </a>
    </sup>
  );
}

// In-prose link to a game hub: reads as body text with a quiet underline so a
// paragraph never turns into a cyan link list (each game links once per page).
const PROSE_LINK =
  'text-text-primary underline decoration-text-secondary/50 underline-offset-4 transition-colors hover:text-accent-cyan hover:decoration-accent-cyan';

function ProseRun({ seg, locale }: { seg: ProseSegment; locale: UiLang }) {
  if (seg.type === 'game') {
    return (
      <Link href={localeHref(locale, `/game/${seg.slug}`)} className={PROSE_LINK}>
        {seg.text}
      </Link>
    );
  }
  return <span>{seg.text}</span>;
}

function ArticleParagraph({ segments, locale }: { segments: ArticleSegment[]; locale: UiLang }) {
  return (
    <p className="text-pretty leading-relaxed text-text-secondary">
      {segments.map((seg, i) =>
        seg.type === 'ref' ? (
          <FootnoteRef key={i} n={seg.n} />
        ) : (
          <ProseRun key={i} seg={seg} locale={locale} />
        ),
      )}
    </p>
  );
}

const SECTION_H2 = 'border-b border-border-default pb-2 text-xl font-bold text-text-primary';
/** Every jump-nav target clears the sticky site header. */
const SECTION = 'mt-8 scroll-mt-24';

function ArticleSection({
  id,
  heading,
  paragraphs,
  locale,
  lang,
  dir,
  figure,
  after,
}: {
  /** Anchor id (jump nav target). */
  id: string;
  heading: string;
  /** Pre-segmented paragraphs (footnote refs + first-mention game links). */
  paragraphs: ArticleSegment[][];
  locale: UiLang;
  /** Content language of the paragraphs (headings stay on the UI axis). */
  lang: string;
  dir: 'rtl' | undefined;
  /** Optional Wikipedia-style thumb, floated inline-end on sm+ so the text
   *  wraps around it (flow-root on the section contains the float). Rendered
   *  AFTER the first paragraph so on phones the section opens with text,
   *  not with a full-width image (W1.8). */
  figure?: ReactNode;
  /** Optional block below the paragraphs, inside the section (W3 timeline). */
  after?: ReactNode;
}) {
  if (paragraphs.length === 0) return null;
  const [first, ...rest] = paragraphs;
  return (
    <section id={id} className={`${SECTION} flow-root`}>
      <h2 className={SECTION_H2}>{heading}</h2>
      <div className="mt-4 space-y-4" lang={lang} dir={dir}>
        <ArticleParagraph segments={first} locale={locale} />
        {figure}
        {rest.map((p, i) => (
          <ArticleParagraph key={i} segments={p} locale={locale} />
        ))}
      </div>
      {after}
    </section>
  );
}

/**
 * W3: dated milestones under the Career paragraphs. Dates are formatted per
 * viewer locale at their own precision (year / month / day); the text is
 * content (article language), the sourcing renders as footnote refs like a
 * fact's. `clear-both` keeps the list below the floated career figure.
 */
function TimelineList({
  heading,
  entries,
  sourceCount,
  locale,
  lang,
  dir,
}: {
  heading: string;
  entries: ReturnType<typeof wikiTimeline>;
  sourceCount: number;
  locale: UiLang;
  lang: string;
  dir: 'rtl' | undefined;
}) {
  if (entries.length === 0) return null;
  return (
    <div className="clear-both pt-6">
      <h3 className="text-sm font-semibold text-text-primary">{heading}</h3>
      <ol className="mt-3 space-y-3 border-s border-border-default ps-4" lang={lang} dir={dir}>
        {entries.map((entry, i) => (
          <li key={`${entry.date}-${i}`} className="text-sm leading-relaxed text-text-secondary">
            <span className="me-2 font-mono text-xs text-accent-cyan">
              {formatTimelineDate(entry.date, locale)}
            </span>
            <span>{entry.text}</span>
            {entry.source_ids
              .filter((n) => Number.isInteger(n) && n >= 1 && n <= sourceCount)
              .map((n) => (
                <FootnoteRef key={n} n={n} />
              ))}
          </li>
        ))}
      </ol>
    </div>
  );
}

/**
 * Still frame of the streamer's most recent broadcast as a Wikipedia-style
 * thumb in the Career section: full-width card on phones, floated
 * inline-end with wrapping text from sm up. Rendered only with a usable
 * thumbnail — falling back to the avatar (like LastStreamCard does) would
 * duplicate the infobox portrait right next to it.
 */
function LastStreamFigure({
  stream,
  streamerName,
  locale,
  L,
}: {
  stream: PublicStreamHistory;
  streamerName: string;
  locale: UiLang;
  L: UiLex;
}) {
  const thumbnailUrl = usableThumbnail(stream.thumbnail_url);
  if (!thumbnailUrl) return null;

  const title = stream.title?.trim() || L.lastStream.pastStream;
  const dateLabel = formatWikiDate(stream.started_at, locale);
  // An anchor must not nest inside another anchor, so the image links only
  // when the session has exactly one recording (same rule as LastStreamCard).
  const vodLinks = historyVodLinks(stream);
  const href = vodLinks.length === 1 ? vodLinks[0].url : null;

  const image = (
    <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-background-highlight">
      <Image
        src={sizedCdnImageUrl(thumbnailUrl, 640)}
        alt={title}
        fill
        unoptimized
        sizes="(min-width: 1024px) 288px, (min-width: 640px) 240px, 100vw"
        className="object-cover"
      />
    </div>
  );

  // `!mt-0` neutralises the parent's space-y so the float hugs the paragraph
  // it follows; the figure's own top margin is `mt-1`.
  return (
    <figure className="!mt-1 w-full rounded-xl border border-border-default bg-background-elevated p-2 sm:float-end sm:mb-3 sm:ms-5 sm:w-60 lg:w-72">
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={L.lastStream.watchAria(streamerName, title)}
          className="block transition-opacity hover:opacity-90"
        >
          {image}
        </a>
      ) : (
        image
      )}
      <figcaption className="mt-2 px-1 pb-1 text-xs leading-snug text-text-secondary">
        <span className="font-semibold text-text-primary">{L.lastStream.heading}:</span> {title}
        {dateLabel ? ` · ${dateLabel}` : ''}
      </figcaption>
    </figure>
  );
}

// ============================================
// History (W4, 2026-09-18)
// ============================================

const EMPTY_CELL = <span className="text-text-secondary">–</span>;

/**
 * One year of monthly rows. A month with a written summary gets a second,
 * full-width row right under its numbers (content axis: `lang`/`dir` follow
 * the paragraph's language, the headers stay in the viewer's UI language).
 */
function HistoryYearTable({
  group,
  locale,
  nativeLang,
  hubSlugs,
  showTopGame,
  L,
}: {
  group: WikiHistoryYear;
  locale: UiLang;
  nativeLang: string | null;
  /** Category name → game hub slug, for catalog games only. */
  hubSlugs: ReadonlyMap<string, string>;
  /** False when NO tracked month names a game (YouTube-only channels: the API
   *  never serves a video bucket as a game) — a column of dashes is noise. */
  showTopGame: boolean;
  L: UiLex;
}) {
  // The summary rows live INSIDE the table, so the table must never scroll
  // horizontally (a scrolled paragraph is unreadable — seen at 400 px).
  // Phones therefore drop the Hours and Followers columns instead.
  const RIGHT = 'px-2 py-2 text-right font-semibold sm:px-3';
  const WIDE = 'hidden sm:table-cell';
  return (
    <div className="mt-4 rounded-xl bg-background-elevated p-1">
      <table className="w-full text-sm">
        <caption className="sr-only">{group.year}</caption>
        <thead>
          <tr className="text-left text-xs uppercase tracking-wider text-text-secondary">
            <th scope="col" className="px-2 py-2 font-semibold sm:px-3">
              {L.wiki.historyColMonth}
            </th>
            <th scope="col" className={RIGHT}>
              {L.wiki.historyColStreams}
            </th>
            <th scope="col" className={`${RIGHT} ${WIDE}`}>
              {L.wiki.historyColHours}
            </th>
            {showTopGame && (
              <th scope="col" className="px-2 py-2 font-semibold sm:px-3">
                {L.wiki.historyColTopGame}
              </th>
            )}
            <th scope="col" className={`${RIGHT} ${WIDE}`}>
              {L.wiki.historyColFollowers}
            </th>
            <th scope="col" className={RIGHT}>
              {L.wiki.historyColViewers}
            </th>
          </tr>
        </thead>
        <tbody>
          {group.entries.map((entry) => {
            const para = historyParagraph(entry, locale, nativeLang);
            return (
              <Fragment key={entry.month}>
                <tr className="border-t border-divider">
                  <th
                    scope="row"
                    className="whitespace-nowrap px-2 py-2 text-left font-medium text-text-primary sm:px-3"
                  >
                    {formatHistoryMonth(entry.month, locale)}
                  </th>
                  <td className="px-2 py-2 text-right tabular-nums text-text-primary sm:px-3">
                    {entry.streams}
                  </td>
                  <td className={`px-3 py-2 text-right tabular-nums text-text-secondary ${WIDE}`}>
                    {formatWholeNumber(entry.hours, locale)}
                  </td>
                  {showTopGame && (
                    <td className="px-2 py-2 text-text-primary sm:min-w-[12rem] sm:px-3">
                      {entry.top_category ? (
                        <>
                          {hubSlugs.has(entry.top_category) ? (
                            <Link
                              href={localeHref(locale, `/game/${hubSlugs.get(entry.top_category)}`)}
                              className="hover:text-accent-cyan"
                            >
                              {entry.top_category}
                            </Link>
                          ) : (
                            entry.top_category
                          )}
                          {entry.top_share_percent !== null && (
                            <span className="whitespace-nowrap text-text-secondary">
                              {' · '}
                              {formatSharePercent(entry.top_share_percent, locale)}
                            </span>
                          )}
                        </>
                      ) : (
                        EMPTY_CELL
                      )}
                    </td>
                  )}
                  <td className={`px-3 py-2 text-right tabular-nums text-text-secondary ${WIDE}`}>
                    {entry.follower_delta !== null
                      ? formatSignedInt(entry.follower_delta, locale)
                      : EMPTY_CELL}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums text-text-secondary sm:px-3">
                    {entry.median_ccv !== null ? formatWholeNumber(entry.median_ccv, locale) : EMPTY_CELL}
                  </td>
                </tr>
                {para && (
                  <tr>
                    <td colSpan={showTopGame ? 6 : 5} className="px-2 pb-3 pt-0 sm:px-3">
                      <p
                        lang={para.lang}
                        dir={dirFor(para.lang)}
                        className="max-w-prose text-pretty text-sm leading-relaxed text-text-secondary"
                      >
                        {para.text}
                      </p>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ============================================
// Own-data sections (W2)
// ============================================

interface NumberTile {
  key: string;
  label: string;
  value: string;
  detail?: string;
}

const TIER_STYLE: Record<string, string> = {
  reliable: 'border-delta-up/40 text-delta-up',
  medium: 'border-viz-soft/40 text-viz-soft',
  unreliable: 'border-delta-down/40 text-delta-down',
};

// ============================================
// Page
// ============================================

export default async function StreamerWikiPage({ params }: Props) {
  const { locale: rawLocale, slug } = await params;
  const locale: UiLang = isUiLang(rawLocale) ? rawLocale : 'en';
  const { streamer, wiki, stats, games, lastStream, upcomingSlots, insights, rankings, clips, recaps } =
    await loadWikiPage(slug);
  if (!streamer || !wiki) notFound();

  const L = uiLexFor(locale);
  const now = new Date();
  const picked = pickWikiArticle(wiki, locale);
  const articleLang = picked.lang;
  const articleDir = dirFor(articleLang);
  const facts = orderedWikiFacts(wiki.facts);
  const sourceCount = wiki.sources.length;
  const updatedIso = wiki.refreshed_at ?? wiki.generated_at;
  // W3: new article parts, all optional in the DTO (pre-W3 profiles → []).
  const timeline = wikiTimeline(picked.article);
  const links = wikiLinks(wiki);
  const contentStyle = picked.article.content_style ?? [];
  const community = picked.article.community ?? [];
  const awards = picked.article.awards ?? [];
  // W4: monthly history — a row per tracked month, summary rows under
  // eventful ones. The newest year is open, older years fold. The newest
  // row's generation time also moves the page's dateModified.
  const history = wikiHistory(wiki);
  const historyYears = groupHistoryByYear(history);
  const showTopGame = history.some((h) => typeof h.top_category === 'string' && h.top_category.length > 0);
  const dateModifiedIso = laterIso(updatedIso, latestHistoryIso(history));
  // W5: change log, grouped per day (section rewrites collapse to one line).
  const changeDays = groupChangesByDay(wikiChanges(wiki));

  // M26 image round: streamer-chosen channel banner as hero backdrop, the
  // 600px avatar variant as infobox portrait (replaces the small header
  // avatar — one portrait, Wikipedia-style).
  const bannerUrl = bannerDisplayUrl(streamer.banner_url ?? null);
  const portraitUrl = avatarLargeUrl(streamer.avatar_url);

  // Same pick as the profile page (cancelled slots excluded, 7-day window) so
  // both surfaces name the same "next stream"; the pill deep-links into that
  // day's section over there.
  const profileHref = localeHref(locale, `/streamer/${encodeURIComponent(slug)}`);
  const nextSlot = pickNextRealSlot(upcomingSlots, sevenDayKeys(now));

  // Extra body text reusing the streamer-page bio (M26: the "Fließtext" of
  // the detail page) — same content-language pick as over there.
  const bio = pickDescription(streamer, locale);
  const bioParagraphs = bio
    ? bio.text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
    : [];

  // Earnings: the article's own paragraphs, or (W1.5) one sentence built from
  // the model-computed income fact so the section the title promises exists.
  const income = incomeFact(wiki.facts);
  const earningsFallback =
    picked.article.earnings.length === 0 && income && income.value_num_low !== null
      ? L.wiki.earningsFallback(
          streamer.name,
          formatUsdRange(income.value_num_low, income.value_num_high, locale),
          income.as_of ? formatFactAsOf(income.as_of, locale) : income.as_of,
        )
      : null;

  // --- own measurements (W2), every block independently optional ---
  const numbers = wikiNumbers(streamer, stats, insights);
  const followerLabel = streamer.platforms.includes('twitch')
    ? L.channelStats.followers
    : L.channelStats.subscribers;
  const tiles: NumberTile[] = [];
  if (numbers) {
    if (numbers.followers !== null) {
      tiles.push({
        key: 'followers',
        label: followerLabel,
        value: formatCompactNumber(numbers.followers, locale),
      });
    }
    if (numbers.medianViewers !== null) {
      tiles.push({
        key: 'median',
        label: L.wiki.numberLabel.medianViewers,
        value: formatCompactNumber(numbers.medianViewers, locale),
      });
    }
    if (numbers.peakViewers !== null) {
      tiles.push({
        key: 'peak',
        label: L.channelStats.peakViewers,
        value: formatCompactNumber(numbers.peakViewers, locale),
        detail: L.channelStats.lastNDays(numbers.windowDays),
      });
    }
    if (numbers.hoursStreamed !== null) {
      tiles.push({
        key: 'hours',
        label: L.channelStats.hoursStreamed,
        value: formatCompactNumber(Math.round(numbers.hoursStreamed), locale),
        detail: L.channelStats.lastNDays(numbers.windowDays),
      });
    }
    if (numbers.streamsPerWeek !== null) {
      tiles.push({
        key: 'perWeek',
        label: L.wiki.numberLabel.streamsPerWeek,
        value: formatStatValue(numbers.streamsPerWeek, locale),
      });
    }
    if (numbers.activeDays !== null) {
      tiles.push({
        key: 'activeDays',
        label: L.wiki.numberLabel.activeDays,
        value: formatStatValue(numbers.activeDays, locale),
      });
    }
    if (numbers.typicalMinutes !== null) {
      tiles.push({
        key: 'typical',
        label: L.wiki.numberLabel.typicalLength,
        value: formatHours(numbers.typicalMinutes, locale),
      });
    }
    if (numbers.followerGain30 !== null) {
      tiles.push({
        key: 'gain30',
        label: L.wiki.numberLabel.followerGain30,
        value: `${numbers.followerGain30 > 0 ? '+' : ''}${formatCompactNumber(numbers.followerGain30, locale)}`,
      });
    }
  }
  const rankingRows = buildStreamerRankingRows(rankings, { metric: L.streamerRankings.metric });
  const followers = followerStats(insights?.follower_trend);
  const showNumbers = tiles.length > 0 || rankingRows.length > 0 || followers !== null;

  const collecting = (insights?.sample_count ?? 0) < COLLECTING_THRESHOLD;
  const weekdayCells = collecting ? null : usableCells(insights?.weekday_viewers ?? null, 7);
  const hourCells = collecting ? null : usableCells(insights?.hour_viewers ?? null, 24);
  const rel = insights?.schedule_reliability ?? null;
  const tier =
    rel && (rel.sample ?? 0) >= RELIABILITY_MIN_SAMPLE && rel.time_tier && rel.time_tier !== 'unknown'
      ? rel.time_tier
      : null;
  const showStreamTimes = weekdayCells !== null || hourCells !== null || tier !== null;

  const gameRows = wikiGamesTable(stats?.top_categories ?? [], games, rankings?.games ?? [], GAMES_LIMIT);
  const recapMentions = wikiRecapMentions(recaps, streamer.id, RECAPS_LIMIT);
  // Quality gate: "Notable moments" only with clips people actually watched.
  const notableClips = wikiNotableClips(clips);

  // Game mentions in the article prose link into their hubs, once per page
  // (first mention, document order: summary, then the sections top to bottom).
  const linkTargets = gameLinkTargets(games);
  const hubSlugs = new Map(linkTargets.map((t) => [t.name, t.slug]));
  const linkedGames = new Set<string>();
  const summarySegments = linkGameMentions(picked.article.summary, linkTargets, linkedGames);
  const segmentsOf = (paragraphs: string[]): ArticleSegment[][] =>
    paragraphs.map((text) => articleSegments(text, sourceCount, linkTargets, linkedGames));
  const careerSegments = segmentsOf(picked.article.career);
  const contentStyleSegments = segmentsOf(contentStyle);
  const communitySegments = segmentsOf(community);
  const awardsSegments = segmentsOf(awards);
  const personalLifeSegments = segmentsOf(picked.article.personal_life);
  const earningsSegments = segmentsOf(picked.article.earnings);

  // Live state comes from the streamer DTO's activity facts. `undefined` (the
  // activity lookup failed) counts as "not live": the next-stream pill is the
  // safe fallback. Freshness: /api/revalidate purges this route on every
  // live/offline transition, exactly like the profile page's LIVE badge.
  const isLive = streamer.is_live === true;

  // Jump nav: one chip per section that actually renders, in page order. The
  // page is ~15 phone screens long; without it "History" or "Sources" is a
  // long blind scroll (audit 2026-09-18).
  const toc: Array<{ id: string; label: string }> = [];
  if (bio && bioParagraphs.length > 0) toc.push({ id: 'wiki-about', label: L.wiki.tocAbout });
  if (careerSegments.length > 0) toc.push({ id: 'wiki-career', label: L.wiki.sectionCareer });
  if (personalLifeSegments.length > 0) {
    toc.push({ id: 'wiki-personal-life', label: L.wiki.sectionPersonalLife });
  }
  if (earningsSegments.length > 0 || earningsFallback) {
    toc.push({ id: 'wiki-earnings', label: L.wiki.sectionEarnings });
  }
  if (historyYears.length > 0) toc.push({ id: 'wiki-history', label: L.wiki.historyHeading });
  if (showNumbers) toc.push({ id: 'wiki-numbers', label: L.wiki.numbersHeading });
  if (showStreamTimes) toc.push({ id: 'wiki-times', label: L.wiki.tocStreamTimes });
  if (gameRows.length > 0) toc.push({ id: 'wiki-games', label: L.wiki.tocGames });
  if (notableClips.length > 0) toc.push({ id: 'wiki-clips', label: L.wiki.clipsHeading });
  if (wiki.sources.length > 0) toc.push({ id: 'wiki-sources', label: L.wiki.sourcesHeading });

  const path = `/streamer/${encodeURIComponent(slug)}/wiki`;
  const breadcrumb = buildBreadcrumbJsonLd([
    {
      name: L.breadcrumb.home,
      url: locale === 'en' ? 'https://streamertimes.tv' : `https://streamertimes.tv/${locale}`,
    },
    {
      name: L.breadcrumb.streamers,
      url: `https://streamertimes.tv${localeHref(locale, '/streamers')}`,
    },
    {
      name: streamer.name,
      url: `https://streamertimes.tv${localeHref(locale, `/streamer/${encodeURIComponent(slug)}`)}`,
    },
    { name: L.wiki.breadcrumb },
  ]);

  // ProfilePage anchored on THIS page (not the parent): own URL, dateModified
  // = the profile's generation time. No net-worth/relationship values in
  // structured data — deliberately visible-text only (M26 §5).
  const person = { ...(buildPersonJsonLd(streamer, slug, locale) as Record<string, unknown>) };
  delete person['@context'];
  const profilePage = {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    url: absoluteLocaleUrl(locale, path),
    dateModified: dateModifiedIso,
    mainEntity: person,
  };

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdHtml(breadcrumb) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdHtml(profilePage) }}
      />

      {/* Visible breadcrumb matching the BreadcrumbList JSON-LD (the "Home"
          crumb stays JSON-LD-only, same convention as the streamer page). */}
      <p className="text-sm text-text-secondary">
        <Link
          href={localeHref(locale, '/streamers')}
          className="-my-1.5 inline-block py-1.5 hover:text-accent-cyan"
        >
          {L.breadcrumb.streamers}
        </Link>{' '}
        /{' '}
        <Link
          href={localeHref(locale, `/streamer/${encodeURIComponent(slug)}`)}
          className="-my-1.5 inline-block py-1.5 hover:text-accent-cyan"
        >
          {streamer.name}
        </Link>{' '}
        / {L.wiki.breadcrumb}
      </p>

      {/* Channel banner hero (M26 image round): the streamer's own channel
          branding (Twitch offline screen / YouTube banner), dimmed toward the
          bottom so the page keeps its dark canvas. Decorative — alt="".
          lg:h-44 (was h-56, W1.7): at 1366×768 the taller hero pushed the
          infobox and the article start below the fold. */}
      {bannerUrl && (
        <div className="relative mt-3 h-32 overflow-hidden rounded-xl border border-border-default sm:h-40 lg:h-44">
          <Image
            src={bannerUrl}
            alt=""
            width={1920}
            height={1080}
            priority
            unoptimized
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/20" />
        </div>
      )}

      {/* Lead + infobox share one grid (UX round 2026-09-18): the H1, the
          status row, the summary and the jump nav sit in the article column
          and the infobox starts BESIDE them, Wikipedia-style. Before, the
          header spanned the full width with 320 px of nothing to its right
          and the first fact sat at y=790 on a 1366x768 laptop, below the
          fold. DOM order = phone order: lead, infobox, article. */}
      <div className="mt-4 grid grid-cols-1 items-start gap-x-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <header className="min-w-0 lg:col-start-1 lg:row-start-1">
          {/* Identity. The portrait lives in the infobox (Wikipedia
              convention), no duplicate avatar up here. */}
          <div className="flex items-start gap-3">
            <h1 className="min-w-0 text-pretty text-3xl font-bold text-white md:text-4xl">
              {L.wiki.heading(streamer.name)}
            </h1>
            <FavoriteButton
              streamerId={streamer.id}
              streamerName={streamer.name}
              size="md"
              className="mt-1 shrink-0"
              language={locale}
            />
          </div>
          <p className="mt-1 text-sm text-text-secondary">
            {L.wiki.updated(formatWikiDate(updatedIso, locale))}
          </p>

          {/* The site's core answer, above the fold: live right now (watch
              buttons) or the next stream. It used to sit at 81 % of the page
              height, and a live streamer's wiki said nothing about it. */}
          {isLive ? (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <LiveBadge language={locale} />
              <WatchButtons
                twitchLogin={streamer.twitch_login}
                youtubeChannelId={streamer.youtube_channel_id}
                grow={false}
                language={locale}
                className="flex flex-wrap gap-2"
              />
            </div>
          ) : (
            nextSlot && (
              <div className="mt-3">
                <HeroNextStream
                  nextSlot={nextSlot}
                  language={locale}
                  href={`${profileHref}#day-${nextSlot.start_time.slice(0, 10)}`}
                  hideUncertainCategory
                />
              </div>
            )
          )}

          {/* Summary: content language, not viewer language. */}
          <p
            lang={articleLang}
            dir={articleDir}
            className="mt-4 max-w-2xl text-pretty text-lg leading-relaxed text-text-secondary"
          >
            {summarySegments.map((seg, i) => (
              <ProseRun key={i} seg={seg} locale={locale} />
            ))}
          </p>
          {articleLang !== locale && (
            <p className="mt-2 text-xs text-text-muted">{L.wiki.articleLanguageNote}</p>
          )}

          {/* Jump nav: one row that scrolls sideways on phones (bleeds to the
              screen edge), wraps from sm up. Plain anchors, no JS. */}
          {toc.length > 1 && (
            <nav aria-label={L.wiki.tocLabel} className="mt-5">
              <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-text-secondary">
                {L.wiki.tocLabel}
              </p>
              <ul className="-mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
                {toc.map((entry) => (
                  <li key={entry.id} className="shrink-0">
                    <a
                      href={`#${entry.id}`}
                      className="inline-flex min-h-9 items-center whitespace-nowrap rounded-full border border-border-default bg-background-elevated px-3 text-sm text-text-primary transition-colors hover:border-accent-cyan/60 hover:text-accent-cyan"
                    >
                      {entry.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </header>

        {/* Infobox: full-width card right after the lead on phones/tablets
            (the quick answer), right rail on lg+ spanning both grid rows so
            it stays sticky along the whole article. Facts flow 2-up from sm
            so the card never becomes a long skinny list on medium screens.
            The sticky rail is capped at the viewport (W1.6): a 714 px card on
            a 768 px laptop used to cut off exactly the income row. */}
        <aside
          className="mt-6 min-w-0 lg:sticky lg:top-24 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:mt-0 lg:max-h-[calc(100vh-6.5rem)] lg:overflow-y-auto lg:overscroll-contain lg:[scrollbar-width:thin]"
          aria-label={L.wiki.factsHeading}
        >
          <div className="rounded-xl border border-border-default bg-background-elevated p-4 sm:p-5">
            <h2 className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-accent-cyan">
              {L.wiki.factsHeading}
            </h2>
            {portraitUrl && (
              <Image
                src={portraitUrl}
                alt={L.hero.avatarAlt(streamer.name)}
                width={600}
                height={600}
                unoptimized
                // lg:w-56 (was w-full = 288 px): with six facts the card then
                // fits a 768 px laptop viewport without the rail scrollbar.
                className="mx-auto mt-3 w-40 rounded-xl border border-border-default sm:w-48 lg:w-56"
              />
            )}
            {facts.length > 0 ? (
              <dl className="mt-3 grid grid-cols-1 gap-x-6 sm:grid-cols-2 lg:grid-cols-1">
                {facts.map((fact) => (
                  <div
                    key={fact.key}
                    className="min-w-0 border-b border-border-default/60 py-2.5 last:border-b-0"
                  >
                    <dt className="text-xs font-medium uppercase tracking-wide text-text-secondary">
                      {L.wiki.factLabel[fact.key as keyof UiLex['wiki']['factLabel']] ?? fact.key}
                    </dt>
                    <dd className="mt-0.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm text-text-primary">
                      <span className="font-semibold break-words">
                        {factValue(fact, locale, L, now)}
                        {fact.source_ids.map((n) => (
                          <FootnoteRef key={n} n={n} />
                        ))}
                      </span>
                      {fact.is_estimate && (
                        <span className="rounded border border-viz-soft/40 px-1.5 py-px font-mono text-[10px] uppercase tracking-wide text-viz-soft">
                          {L.wiki.estimate}
                        </span>
                      )}
                      {fact.as_of && (
                        <span className="text-xs text-text-secondary">{L.wiki.asOf(formatFactAsOf(fact.as_of, locale))}</span>
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="mt-3 text-sm text-text-secondary">{L.wiki.minorNote}</p>
            )}
            {wiki.is_minor && facts.length > 0 && (
              <p className="mt-3 text-xs text-text-secondary">{L.wiki.minorNote}</p>
            )}
            {/* W3: official accounts as chips. External, so nofollow like the
                sources; the API allow-listed the hosts at generation time. */}
            {links.length > 0 && (
              <div className="mt-4 border-t border-border-default/60 pt-3">
                <h3 className="text-xs font-medium uppercase tracking-wide text-text-secondary">
                  {L.wiki.linksLabel}
                </h3>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {links.map((link) => (
                    <li key={link.platform}>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="nofollow noopener noreferrer"
                        className="inline-flex min-h-8 items-center rounded-full border border-border-default bg-background px-3 text-xs font-semibold text-text-primary transition-colors hover:border-accent-cyan/60 hover:text-accent-cyan"
                      >
                        {wikiLinkLabel(link.platform)}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </aside>

        {/* Article column. Headings/sources/disclaimer stay on the viewer-UI
            axis; only paragraph blocks carry the content language + dir. */}
        <div className="min-w-0 lg:col-start-1 lg:row-start-2">
          {/* Site bio as extra body text (own content language + dir) —
              deliberately FIRST: the hand-curated "who is this" text opens
              the page, the sourced AI sections follow (user decision
              2026-08-19). */}
          {bio && bioParagraphs.length > 0 && (
            <section id="wiki-about" className={SECTION}>
              <h2 className={SECTION_H2}>{L.wiki.aboutHeading(streamer.name)}</h2>
              <div className="mt-4 space-y-4" lang={bio.lang} dir={bio.dir}>
                {bioParagraphs.map((p, i) => (
                  <p key={i} className="text-pretty leading-relaxed text-text-secondary">
                    {p}
                  </p>
                ))}
              </div>
            </section>
          )}

          <ArticleSection
            id="wiki-career"
            heading={L.wiki.sectionCareer}
            paragraphs={careerSegments}
            locale={locale}
            lang={articleLang}
            dir={articleDir}
            figure={
              lastStream ? (
                <LastStreamFigure
                  stream={lastStream}
                  streamerName={streamer.name}
                  locale={locale}
                  L={L}
                />
              ) : undefined
            }
            after={
              <TimelineList
                heading={L.wiki.timelineHeading}
                entries={timeline}
                sourceCount={sourceCount}
                locale={locale}
                lang={articleLang}
                dir={articleDir}
              />
            }
          />
          {/* W3 sections between Career and Personal life: what a stream
              looks like (own measurements, cited to the profile), the
              community, awards. Each hides itself when empty. */}
          <ArticleSection
            id="wiki-content-style"
            heading={L.wiki.sectionContentStyle}
            paragraphs={contentStyleSegments}
            locale={locale}
            lang={articleLang}
            dir={articleDir}
          />
          <ArticleSection
            id="wiki-community"
            heading={L.wiki.sectionCommunity}
            paragraphs={communitySegments}
            locale={locale}
            lang={articleLang}
            dir={articleDir}
          />
          <ArticleSection
            id="wiki-awards"
            heading={L.wiki.sectionAwards}
            paragraphs={awardsSegments}
            locale={locale}
            lang={articleLang}
            dir={articleDir}
          />
          <ArticleSection
            id="wiki-personal-life"
            heading={L.wiki.sectionPersonalLife}
            paragraphs={personalLifeSegments}
            locale={locale}
            lang={articleLang}
            dir={articleDir}
          />
          {earningsSegments.length > 0 ? (
            <ArticleSection
              id="wiki-earnings"
              heading={L.wiki.sectionEarnings}
              paragraphs={earningsSegments}
              locale={locale}
              lang={articleLang}
              dir={articleDir}
            />
          ) : (
            earningsFallback && (
              <section id="wiki-earnings" className={SECTION}>
                <h2 className={SECTION_H2}>{L.wiki.sectionEarnings}</h2>
                <p className="mt-4 text-pretty leading-relaxed text-text-secondary">
                  {earningsFallback}
                  {income?.source_ids.map((n) => (
                    <FootnoteRef key={n} n={n} />
                  ))}
                </p>
                <p className="mt-2 text-sm">
                  <Link
                    href={localeHref(locale, '/methodology/income-estimates')}
                    className="font-semibold text-accent-cyan hover:underline"
                  >
                    {L.wiki.earningsMethodology} →
                  </Link>
                </p>
              </section>
            )
          )}

          {/* W4: month-by-month history from our own tracking. Every tracked
              month is a row; eventful months carry a written summary
              (streamer language when the viewer reads it, else English).
              The newest year is open, older years fold into <details>. */}
          {historyYears.length > 0 && (
            <section id="wiki-history" className={SECTION} aria-labelledby="wiki-history-heading">
              <h2 id="wiki-history-heading" className={SECTION_H2}>
                {L.wiki.historyHeading}
              </h2>
              <p className="mt-2 text-sm text-text-secondary">{L.wiki.historyNote}</p>
              {historyYears.map((group, i) =>
                i === 0 ? (
                  <HistoryYearTable
                    key={group.year}
                    group={group}
                    locale={locale}
                    nativeLang={wiki.native_lang}
                    hubSlugs={hubSlugs}
                    showTopGame={showTopGame}
                    L={L}
                  />
                ) : (
                  <details key={group.year} className="mt-4">
                    <summary className="cursor-pointer text-sm font-semibold text-accent-cyan hover:underline">
                      {L.wiki.historyShowYear(group.year)}
                    </summary>
                    <HistoryYearTable
                      group={group}
                      locale={locale}
                      nativeLang={wiki.native_lang}
                      hubSlugs={hubSlugs}
                    showTopGame={showTopGame}
                      L={L}
                    />
                  </details>
                ),
              )}
            </section>
          )}

          {/* W2.1: own measurements — tiles, leaderboard placements, follower
              chart. Numbers are locale-formatted; nothing here depends on
              "now" (ISR byte-determinism). */}
          {showNumbers && (
            <section id="wiki-numbers" className={SECTION} aria-labelledby="wiki-numbers-heading">
              <h2 id="wiki-numbers-heading" className={SECTION_H2}>
                {L.wiki.numbersHeading}
              </h2>
              {tiles.length > 0 && (
                <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {tiles.map((tile) => (
                    <div key={tile.key} className="rounded-xl bg-background-elevated p-3">
                      <dt className="text-xs uppercase tracking-wider text-text-secondary">
                        {tile.label}
                      </dt>
                      <dd className="mt-1 text-lg font-bold tabular-nums text-text-primary">
                        {tile.value}
                        {tile.detail ? (
                          <span className="block text-xs font-normal normal-case text-text-secondary">
                            {tile.detail}
                          </span>
                        ) : null}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
              {rankingRows.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-semibold text-text-primary">
                    {L.streamerRankings.heading}
                  </h3>
                  <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                    {rankingRows.map((row) => {
                      const total = formatCompactNumber(row.total, locale);
                      const body = (
                        <>
                          <span className="text-lg font-bold tabular-nums text-accent-cyan">
                            #{row.rank}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-text-primary">
                              {row.label}
                            </span>
                            <span className="block text-xs text-text-secondary">
                              {L.streamerRankings.ofTotal(total)}
                            </span>
                          </span>
                        </>
                      );
                      const cls =
                        'flex items-center gap-3 rounded-xl bg-background-elevated p-3 transition-colors';
                      return (
                        <li key={row.key}>
                          {row.href ? (
                            <Link
                              href={localeHref(locale, row.href)}
                              aria-label={L.streamerRankings.rowAria(row.rank, total, row.label)}
                              className={`${cls} hover:ring-1 hover:ring-accent-cyan/40`}
                            >
                              {body}
                            </Link>
                          ) : (
                            <div className={cls}>{body}</div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
              {followers && (
                <div className="mt-6 max-w-2xl">
                  <h3 className="text-sm font-semibold text-text-primary">{followerLabel}</h3>
                  <div className="mt-2">
                    <FollowerGrowthChart
                      points={followers.points}
                      lang={locale}
                      labels={{
                        now: L.wiki.charts.followersNow,
                        low: L.wiki.charts.followersLow,
                        followers: followerLabel.toLocaleLowerCase(locale),
                        aria: L.wiki.charts.followerAria,
                      }}
                    />
                  </div>
                </div>
              )}
              <p className="mt-3 text-xs text-text-secondary">
                {L.wiki.numbersNote(numbers?.windowDays ?? 28)}
              </p>
            </section>
          )}

          {/* W2.2: viewer heatmap under a question-form heading (the SERP
              question this page competes for), plus the M14 reliability tier. */}
          {showStreamTimes && (
            <section id="wiki-times" className={SECTION} aria-labelledby="wiki-times-heading">
              <h2 id="wiki-times-heading" className={SECTION_H2}>
                {L.wiki.streamTimesHeading(streamer.name)}
              </h2>
              {tier && (
                <p className="mt-4 flex flex-wrap items-center gap-2 text-sm text-text-secondary">
                  <span>{L.wiki.reliabilityLabel}:</span>
                  <span
                    className={`inline-block rounded-full border bg-background px-2.5 py-1 text-xs font-semibold ${
                      TIER_STYLE[tier] ?? ''
                    }`}
                  >
                    {L.wiki.reliabilityTier[tier as keyof UiLex['wiki']['reliabilityTier']] ?? tier}
                  </span>
                </p>
              )}
              {(weekdayCells || hourCells) && (
                <div className="mt-4">
                  <InsightsCharts
                    weekdayCells={weekdayCells}
                    hourCells={hourCells}
                    streamerTimezone={insights?.timezone ?? streamer.timezone ?? null}
                    labels={L.wiki.charts}
                    weekdayLabels={weekdayShortLabels(locale)}
                    lang={locale}
                  />
                </div>
              )}
              <p className="mt-3 text-sm">
                <Link
                  href={profileHref}
                  className="-my-1.5 inline-block py-1.5 font-semibold text-accent-cyan hover:underline"
                >
                  {L.wiki.fullSchedule(streamer.name)} →
                </Link>
              </p>
            </section>
          )}

          {/* W2.3: every top category as a table (share, streams, in-game
              rank) — internal links into the game hubs and per-game rankings.
              Box art only for hub games; the old tile row dropped every
              category without a hub page. */}
          {gameRows.length > 0 && (
            <section id="wiki-games" className={SECTION} aria-labelledby="wiki-games-heading">
              <h2 id="wiki-games-heading" className={SECTION_H2}>
                {L.stats.topCategories}
              </h2>
              <div className="mt-4 overflow-x-auto rounded-xl bg-background-elevated p-1">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wider text-text-secondary">
                      <th scope="col" className="px-3 py-2 font-semibold">
                        {L.wiki.gamesColGame}
                      </th>
                      <th scope="col" className="px-3 py-2 text-right font-semibold">
                        {L.wiki.gamesColShare}
                      </th>
                      <th scope="col" className="px-3 py-2 text-right font-semibold">
                        {L.wiki.gamesColStreams}
                      </th>
                      <th scope="col" className="px-3 py-2 text-right font-semibold">
                        {L.wiki.gamesColRank}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {gameRows.map((row) => (
                      <tr key={row.category} className="border-t border-divider">
                        <th scope="row" className="px-3 py-2 text-left font-medium">
                          <span className="flex items-center gap-2">
                            {row.boxArtUrl && (
                              <Image
                                src={sizedCdnImageUrl(row.boxArtUrl, 32)}
                                alt=""
                                width={32}
                                height={43}
                                unoptimized
                                className="h-[43px] w-8 shrink-0 rounded border border-border-default"
                              />
                            )}
                            {row.slug ? (
                              <Link
                                href={localeHref(locale, `/game/${row.slug}`)}
                                className="text-text-primary hover:text-accent-cyan"
                              >
                                {row.category}
                              </Link>
                            ) : (
                              <span className="text-text-primary">{row.category}</span>
                            )}
                          </span>
                        </th>
                        <td className="px-3 py-2 text-right font-semibold tabular-nums text-text-primary">
                          {formatSharePercent(row.sharePercent, locale)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-text-secondary">
                          {row.streams}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {row.rank !== null && row.total !== null ? (
                            row.rankHref ? (
                              <Link
                                href={localeHref(locale, row.rankHref)}
                                aria-label={L.streamerRankings.rowAria(
                                  row.rank,
                                  formatCompactNumber(row.total, locale),
                                  row.category,
                                )}
                                className="-mx-2 -my-1.5 inline-block px-2 py-1.5 font-semibold text-accent-cyan hover:underline"
                              >
                                #{row.rank}
                              </Link>
                            ) : (
                              <span className="font-semibold text-text-primary">#{row.rank}</span>
                            )
                          ) : (
                            <span className="text-text-secondary">–</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs text-text-secondary">
                {L.wiki.gamesNote(stats?.window_days ?? 28)}
              </p>
            </section>
          )}

          {/* W2.4: most-watched clips. External Twitch links on purpose — the
              hosted /clip/<slug> page is a chrome-less embed wrapper for the
              app, not a page to send readers to. */}
          {notableClips.length > 0 && (
            <section id="wiki-clips" className={SECTION} aria-labelledby="wiki-clips-heading">
              <h2 id="wiki-clips-heading" className={SECTION_H2}>
                {L.wiki.clipsHeading}
              </h2>
              <p className="mt-2 text-sm text-text-secondary">{L.wiki.clipsIntro(streamer.name)}</p>
              <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {notableClips.map((clip) => {
                  const title = clip.title?.trim() || clip.category || streamer.name;
                  const dateLabel = clip.clip_created_at
                    ? formatWikiShortDate(clip.clip_created_at, locale)
                    : '';
                  const metaParts = [
                    clip.view_count !== null
                      ? L.wiki.clipViews(formatCompactNumber(clip.view_count, locale))
                      : null,
                    clip.category,
                    dateLabel || null,
                  ].filter(Boolean);
                  return (
                    <li key={clip.id}>
                      <a
                        href={clip.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={L.wiki.clipAria(title)}
                        className="group block rounded-xl border border-border-default bg-background-elevated p-2 transition-colors hover:border-accent-cyan/60"
                      >
                        <span className="relative block aspect-video w-full overflow-hidden rounded-lg bg-background-highlight">
                          {clip.thumbnail_url && (
                            <Image
                              src={clip.thumbnail_url}
                              alt=""
                              fill
                              unoptimized
                              sizes="(min-width: 1024px) 288px, (min-width: 640px) 50vw, 100vw"
                              className="object-cover transition-opacity group-hover:opacity-90"
                            />
                          )}
                        </span>
                        <span className="mt-2 block truncate px-1 text-sm font-semibold text-text-primary">
                          {title}
                        </span>
                        {metaParts.length > 0 && (
                          <span className="mt-0.5 block truncate px-1 pb-1 text-xs text-text-secondary">
                            {metaParts.join(' · ')}
                          </span>
                        )}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {/* W2.5: recap editions with this streamer among the protagonists. */}
          {recapMentions.length > 0 && (
            <section className="mt-8" aria-labelledby="wiki-recaps-heading">
              <h2 id="wiki-recaps-heading" className={SECTION_H2}>
                {L.wiki.recapsHeading}
              </h2>
              <p className="mt-2 text-sm text-text-secondary">{L.wiki.recapsIntro(streamer.name)}</p>
              <ul className="mt-4 space-y-2">
                {recapMentions.map((recap) => (
                  <li key={recap.slug} className="text-sm">
                    <Link
                      href={localeHref(locale, `/rankings/recap/${encodeURIComponent(recap.slug)}`)}
                      className="font-semibold text-accent-cyan hover:underline"
                    >
                      {recap.title}
                    </Link>
                    {recap.published_at && (
                      <span className="text-text-secondary">
                        {' · '}
                        {formatWikiDate(recap.published_at, locale)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Next stream (2026-08-19): the profile page's answer pill, deep-
              linked into its schedule; always followed by the full-schedule
              link so the section is useful even without an upcoming slot. */}
          <section className="mt-8">
            <h2 className={SECTION_H2}>{L.wiki.nextStreamHeading}</h2>
            <div className="mt-4 flex flex-col items-start gap-3">
              {nextSlot && (
                <HeroNextStream
                  nextSlot={nextSlot}
                  language={locale}
                  href={`${profileHref}#day-${nextSlot.start_time.slice(0, 10)}`}
                  hideUncertainCategory
                />
              )}
              <Link
                href={profileHref}
                className="-my-1.5 inline-block py-1.5 text-sm font-semibold text-accent-cyan hover:underline"
              >
                {L.wiki.fullSchedule(streamer.name)} →
              </Link>
            </div>
          </section>

          {/* Sources — ids are the [n] anchor targets. */}
          {wiki.sources.length > 0 && (
            <section id="wiki-sources" className={SECTION}>
              <h2 className={SECTION_H2}>{L.wiki.sourcesHeading}</h2>
              <ol className="mt-4 list-none space-y-2">
                {wiki.sources.map((source, i) => {
                  const n = i + 1;
                  let label = source.title;
                  if (!label) {
                    try {
                      label = new URL(source.url).hostname.replace(/^www\./, '');
                    } catch {
                      label = source.url;
                    }
                  }
                  // Own pages (e.g. the income-methodology source of the
                  // model-computed income fact) navigate in-tab and without
                  // nofollow; external sources keep the defensive rel.
                  const isInternal = source.url.startsWith('https://streamertimes.tv/');
                  return (
                    <li
                      key={n}
                      id={`wiki-source-${n}`}
                      // :target = the footnote the reader just jumped to; without
                      // the tint it is one of eleven identical rows.
                      className="-mx-2 flex min-w-0 scroll-mt-24 gap-2 rounded-md px-2 py-0.5 text-sm target:bg-accent-cyan/10 target:ring-1 target:ring-accent-cyan/40"
                    >
                      <span className="shrink-0 font-mono text-xs text-text-secondary">[{n}]</span>
                      <span className="min-w-0">
                        <a
                          href={source.url}
                          {...(isInternal
                            ? {}
                            : { target: '_blank', rel: 'nofollow noopener noreferrer' })}
                          className="break-words text-accent-cyan hover:underline"
                        >
                          {label}
                        </a>
                        {(source.publisher || source.published) && (
                          <span className="text-text-secondary">
                            {' · '}
                            {[
                              source.publisher,
                              source.published ? formatSourceDate(source.published, locale) : null,
                            ]
                              .filter(Boolean)
                              .join(', ')}
                          </span>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </section>
          )}

          {/* Disclaimer + correction/removal contact (M26 §5 — mandatory). */}
          <section className="mt-8 rounded-xl border border-border-default bg-background-elevated p-4 sm:p-5">
            <h2 className="text-sm font-semibold text-text-primary">
              {L.wiki.disclaimerHeading}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-text-secondary">
              {L.wiki.disclaimer(streamer.name)}
            </p>
            <p className="mt-2 text-sm text-text-secondary">
              {L.wiki.disclaimerContact}{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-accent-cyan underline hover:text-text-primary">
                {CONTACT_EMAIL}
              </a>
            </p>
            {/* W5: what changed between editions (facts with values formatted
                like the infobox, section rewrites as one line per day). */}
            {changeDays.length > 0 && (
              <div className="mt-4 border-t border-border-default pt-4">
                <h3 className="text-sm font-semibold text-text-primary">{L.wiki.changesHeading}</h3>
                <ul className="mt-2 space-y-3 text-sm text-text-secondary">
                  {changeDays.map((day) => {
                    const lines = day.facts
                      .map((c) => changeLine(c, locale, L, now))
                      .filter((line): line is string => line !== null);
                    if (day.sections.length > 0) {
                      lines.push(
                        L.wiki.changeSections(day.sections.map((s) => sectionLabelText(s, L)).join(', ')),
                      );
                    }
                    if (lines.length === 0) return null;
                    return (
                      <li key={day.day}>
                        <span className="font-medium text-text-primary">{formatWikiDate(day.iso, locale)}</span>
                        <ul className="mt-1 list-disc space-y-0.5 ps-5">
                          {lines.map((line, i) => (
                            <li key={i}>{line}</li>
                          ))}
                        </ul>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* W2.6: same related-streamers block as the profile page — the wiki
          used to be a link-graph dead end (9 internal links, 2 of them to its
          own parent). revalidate 3600 so it cannot drag this route's TTL to
          its 1800 default. Deliberately no Suspense (cached ISR HTML would
          keep the fallback markup, making the SEO links JS-dependent). */}
      <RelatedStreamers
        currentId={streamer.id}
        language={streamer.language}
        category={stats?.top_categories[0]?.category ?? null}
        uiLanguage={locale}
        revalidate={3600}
      />
    </main>
  );
}
