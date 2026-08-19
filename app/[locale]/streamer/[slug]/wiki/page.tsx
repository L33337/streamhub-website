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

import { cache, type ReactNode } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import {
  getPartnerApi,
  type PublicGame,
  type PublicStreamer,
  type PublicStreamerStats,
  type PublicStreamerWiki,
  type PublicStreamHistory,
  type WikiFact,
} from '@/lib/server/partner-api';
import { historyVodLinks, usableThumbnail } from '@/lib/history';
import {
  applyLocaleSeo,
  buildBreadcrumbJsonLd,
  buildPersonJsonLd,
  absoluteLocaleUrl,
  dirFor,
  isIndexableStreamerSlug,
  jsonLdHtml,
  pickDescription,
  streamerIndexableLocales,
} from '@/lib/seo';
import { isUiLang, localeHref, type UiLang } from '@/lib/i18n-core';
import { sizedCdnImageUrl } from '@/lib/format/image-size';
import { uiLexFor, type UiLex } from '@/lib/i18n-ui';
import {
  avatarLargeUrl,
  bannerDisplayUrl,
  displayAge,
  formatBirthDate,
  formatRegion,
  formatSharePercent,
  formatUsdRange,
  formatWikiDate,
  orderedWikiFacts,
  pickWikiArticle,
  splitFootnotes,
  wikiMetaDescription,
  wikiTopGames,
} from '@/lib/wiki';

export const revalidate = 3600;

const CONTACT_EMAIL = 'StreamHub.Privacy@icloud.com';

interface Props {
  params: Promise<{ locale: string; slug: string }>;
}

interface WikiPageData {
  streamer: PublicStreamer | null;
  wiki: PublicStreamerWiki | null;
  stats: PublicStreamerStats | null;
  games: PublicGame[];
  lastStream: PublicStreamHistory | null;
}

// streamer+wiki gate the page (no profile = 404); stats+games (box-art row)
// and lastStream (career figure) are best-effort — their failure must
// never 404 a live wiki page. Explicit revalidate ≥ the route value so no
// fetch drags the ISR window down (Next min() rule).
const loadWikiPage = cache(async (slug: string): Promise<WikiPageData> => {
  const api = getPartnerApi();
  const [streamer, wiki, stats, games, lastStream] = await Promise.all([
    api.getStreamer(slug, { revalidate: 3600 }).catch(() => null),
    api.getStreamerWiki(slug, { revalidate: 3600 }),
    api.getStreamerStats(slug, { revalidate: 3600 }).catch(() => null),
    api
      .listGames({ limit: 500, revalidate: 3600 })
      .then((r) => r.data)
      .catch(() => [] as PublicGame[]),
    api.getLastStream(slug, { revalidate: 3600 }),
  ]);
  return { streamer, wiki, stats, games, lastStream };
});

export async function generateStaticParams() {
  // ISR-K1: SSG mode; variants render on demand.
  return [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale: UiLang = isUiLang(rawLocale) ? rawLocale : 'en';
  const { streamer, wiki } = await loadWikiPage(slug);
  if (!streamer || !wiki) return { title: 'Streamer not found — Streamer Times' };

  const L = uiLexFor(locale);
  const { article } = pickWikiArticle(wiki, locale);
  // Year from generated_at, not from the clock: the title only changes when
  // the profile actually changes (ISR byte-determinism), and it is honest —
  // the facts ARE from that year.
  const year = (wiki.refreshed_at ?? wiki.generated_at).slice(0, 4);
  const meta: Metadata = {
    title: `${L.wiki.metaTitle(streamer.name, year)} — Streamer Times`,
    description: wikiMetaDescription(article.summary),
  };
  if (!isIndexableStreamerSlug(slug)) {
    meta.robots = { index: false, follow: true };
  }
  return applyLocaleSeo(
    meta,
    locale,
    `/streamer/${encodeURIComponent(slug)}/wiki`,
    streamerIndexableLocales(streamer.language),
  );
}

// ============================================
// Fact value rendering (locale-aware)
// ============================================

function factValue(fact: WikiFact, locale: UiLang, L: UiLex, now: Date): string {
  switch (fact.key) {
    case 'birth_date': {
      const base = formatBirthDate(fact.value, locale);
      const age = displayAge(fact.value, now);
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

/** Sup footnote link, shared by infobox facts and article paragraphs. */
function FootnoteRef({ n }: { n: number }) {
  return (
    <sup className="ml-0.5">
      <a
        href={`#wiki-source-${n}`}
        className="font-mono text-[11px] text-accent-cyan hover:underline"
      >
        [{n}]
      </a>
    </sup>
  );
}

function ArticleParagraph({ text, sourceCount }: { text: string; sourceCount: number }) {
  return (
    <p className="text-pretty leading-relaxed text-text-secondary">
      {splitFootnotes(text, sourceCount).map((seg, i) =>
        seg.type === 'ref' ? <FootnoteRef key={i} n={seg.n} /> : <span key={i}>{seg.text}</span>,
      )}
    </p>
  );
}

function ArticleSection({
  heading,
  paragraphs,
  sourceCount,
  lang,
  dir,
  figure,
}: {
  heading: string;
  paragraphs: string[];
  sourceCount: number;
  /** Content language of the paragraphs (headings stay on the UI axis). */
  lang: string;
  dir: 'rtl' | undefined;
  /** Optional Wikipedia-style thumb, floated inline-end on sm+ so the text
   *  wraps around it (flow-root on the section contains the float). */
  figure?: ReactNode;
}) {
  if (paragraphs.length === 0) return null;
  return (
    <section className="mt-8 flow-root">
      <h2 className="border-b border-border-default pb-2 text-xl font-bold text-text-primary">
        {heading}
      </h2>
      {figure}
      <div className="mt-4 space-y-4" lang={lang} dir={dir}>
        {paragraphs.map((p, i) => (
          <ArticleParagraph key={i} text={p} sourceCount={sourceCount} />
        ))}
      </div>
    </section>
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

  return (
    <figure className="mt-4 w-full rounded-xl border border-border-default bg-background-elevated p-2 sm:float-end sm:mb-3 sm:ms-5 sm:w-60 lg:w-72">
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
      <figcaption className="mt-2 px-1 pb-1 text-xs leading-snug text-text-muted">
        <span className="font-semibold text-text-secondary">{L.lastStream.heading}:</span> {title}
        {dateLabel ? ` · ${dateLabel}` : ''}
      </figcaption>
    </figure>
  );
}

// ============================================
// Page
// ============================================

export default async function StreamerWikiPage({ params }: Props) {
  const { locale: rawLocale, slug } = await params;
  const locale: UiLang = isUiLang(rawLocale) ? rawLocale : 'en';
  const { streamer, wiki, stats, games, lastStream } = await loadWikiPage(slug);
  if (!streamer || !wiki) notFound();

  const L = uiLexFor(locale);
  const now = new Date();
  const picked = pickWikiArticle(wiki, locale);
  const articleLang = picked.lang;
  const articleDir = dirFor(articleLang);
  const facts = orderedWikiFacts(wiki.facts);
  const sourceCount = wiki.sources.length;
  const updatedIso = wiki.refreshed_at ?? wiki.generated_at;

  // M26 image round: streamer-chosen channel banner as hero backdrop, the
  // 600px avatar variant as infobox portrait (replaces the small header
  // avatar — one portrait, Wikipedia-style), top games as box-art tiles.
  const bannerUrl = bannerDisplayUrl(streamer.banner_url ?? null);
  const portraitUrl = avatarLargeUrl(streamer.avatar_url);
  const topGames = wikiTopGames(stats?.top_categories ?? [], games);

  // Extra body text reusing the streamer-page bio (M26: the "Fließtext" of
  // the detail page) — same content-language pick as over there.
  const bio = pickDescription(streamer, locale);
  const bioParagraphs = bio
    ? bio.text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
    : [];

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
    dateModified: updatedIso,
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
      <p className="text-sm text-text-muted">
        <Link href={localeHref(locale, '/streamers')} className="hover:text-accent-cyan">
          {L.breadcrumb.streamers}
        </Link>{' '}
        /{' '}
        <Link
          href={localeHref(locale, `/streamer/${encodeURIComponent(slug)}`)}
          className="hover:text-accent-cyan"
        >
          {streamer.name}
        </Link>{' '}
        / {L.wiki.breadcrumb}
      </p>

      {/* Channel banner hero (M26 image round): the streamer's own channel
          branding (Twitch offline screen / YouTube banner), dimmed toward the
          bottom so the page keeps its dark canvas. Decorative — alt="". */}
      {bannerUrl && (
        <div className="relative mt-3 h-32 overflow-hidden rounded-xl border border-border-default sm:h-44 lg:h-56">
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

      {/* Identity header. The portrait lives in the infobox (Wikipedia
          convention) — no duplicate avatar up here. */}
      <div className="mt-4 min-w-0">
        <h1 className="text-pretty text-3xl font-bold text-white md:text-4xl">
          {L.wiki.heading(streamer.name)}
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          {L.wiki.updated(formatWikiDate(updatedIso, locale))}
        </p>
      </div>

      {/* Summary — content language, not viewer language. */}
      <p
        lang={articleLang}
        dir={articleDir}
        className="mt-4 max-w-2xl text-pretty text-lg leading-relaxed text-text-secondary"
      >
        {picked.article.summary}
      </p>

      <div className="mt-8 grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Infobox: full-width card first on phones/tablets (the quick
            answer), right rail on lg+. Facts flow 2-up from sm so the card
            never becomes a long skinny list on medium screens. */}
        <aside className="order-1 min-w-0 lg:order-2 lg:sticky lg:top-24" aria-label={L.wiki.factsHeading}>
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
                className="mx-auto mt-3 w-40 rounded-xl border border-border-default sm:w-48 lg:w-full"
              />
            )}
            {facts.length > 0 ? (
              <dl className="mt-3 grid grid-cols-1 gap-x-6 sm:grid-cols-2 lg:grid-cols-1">
                {facts.map((fact) => (
                  <div
                    key={fact.key}
                    className="min-w-0 border-b border-border-default/60 py-2.5 last:border-b-0"
                  >
                    <dt className="text-xs font-medium uppercase tracking-wide text-text-muted">
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
                        <span className="text-xs text-text-muted">{L.wiki.asOf(fact.as_of)}</span>
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="mt-3 text-sm text-text-muted">{L.wiki.minorNote}</p>
            )}
            {wiki.is_minor && facts.length > 0 && (
              <p className="mt-3 text-xs text-text-muted">{L.wiki.minorNote}</p>
            )}
          </div>
        </aside>

        {/* Article column. Headings/sources/disclaimer stay on the viewer-UI
            axis; only paragraph blocks carry the content language + dir. */}
        <div className="order-2 min-w-0 lg:order-1">
          {/* Site bio as extra body text (own content language + dir) —
              deliberately FIRST: the hand-curated "who is this" text opens
              the page, the sourced AI sections follow (user decision
              2026-08-19). */}
          {bio && bioParagraphs.length > 0 && (
            <section className="mt-8">
              <h2 className="border-b border-border-default pb-2 text-xl font-bold text-text-primary">
                {L.wiki.aboutHeading(streamer.name)}
              </h2>
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
            heading={L.wiki.sectionCareer}
            paragraphs={picked.article.career}
            sourceCount={sourceCount}
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
          />
          <ArticleSection
            heading={L.wiki.sectionPersonalLife}
            paragraphs={picked.article.personal_life}
            sourceCount={sourceCount}
            lang={articleLang}
            dir={articleDir}
          />
          <ArticleSection
            heading={L.wiki.sectionEarnings}
            paragraphs={picked.article.earnings}
            sourceCount={sourceCount}
            lang={articleLang}
            dir={articleDir}
          />

          {/* Top games as box-art tiles (M26 image round) — internal links
              into the game hubs. UI-axis heading; hidden when the stats feed
              or games catalog is unavailable. */}
          {topGames.length > 0 && (
            <section className="mt-8">
              <h2 className="border-b border-border-default pb-2 text-xl font-bold text-text-primary">
                {L.stats.topCategories}
              </h2>
              <div className="mt-4 flex flex-wrap gap-4">
                {topGames.map((game) => (
                  <Link
                    key={game.slug}
                    href={localeHref(locale, `/game/${game.slug}`)}
                    className="group w-24 min-w-0 sm:w-28"
                  >
                    <Image
                      src={sizedCdnImageUrl(game.boxArtUrl, 112)}
                      alt={game.category}
                      width={285}
                      height={380}
                      unoptimized
                      className="w-full rounded-lg border border-border-default transition-colors group-hover:border-accent-cyan/60"
                    />
                    <span className="mt-1.5 block text-center text-xs leading-snug text-text-secondary group-hover:text-accent-cyan">
                      {game.category}
                    </span>
                    <span className="block text-center text-xs font-semibold text-text-muted">
                      {formatSharePercent(game.sharePercent, locale)}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Sources — ids are the [n] anchor targets. */}
          {wiki.sources.length > 0 && (
            <section className="mt-8">
              <h2 className="border-b border-border-default pb-2 text-xl font-bold text-text-primary">
                {L.wiki.sourcesHeading}
              </h2>
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
                      className="flex min-w-0 scroll-mt-24 gap-2 text-sm"
                    >
                      <span className="shrink-0 font-mono text-xs text-text-muted">[{n}]</span>
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
                          <span className="text-text-muted">
                            {' — '}
                            {[source.publisher, source.published].filter(Boolean).join(', ')}
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
            <p className="mt-2 text-sm leading-relaxed text-text-muted">
              {L.wiki.disclaimer(streamer.name)}
            </p>
            <p className="mt-2 text-sm text-text-muted">
              {L.wiki.disclaimerContact}{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-accent-cyan hover:underline">
                {CONTACT_EMAIL}
              </a>
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
