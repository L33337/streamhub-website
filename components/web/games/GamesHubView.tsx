import Link from 'next/link';
import { buildBreadcrumbJsonLd } from '@/lib/seo';
import {
  buildGamesCollectionPageJsonLd,
  buildGamesHubFaq,
  buildGamesHubIntro,
  buildHubItemListEntries,
  GAMES_HUB_VIEWS,
  gamesHubPath,
  type GamesHubViewSpec,
} from '@/lib/games-hub';
import { localeHref, type UiLang } from '@/lib/i18n-core';
import { buildRootGamesFaq, hubLexFor, type HubLex } from '@/lib/i18n-hub';
import { sortGames } from '@/lib/games-sort';
import { loadGamesHub, type GameWithSlug } from '@/lib/server/games-hub-data';
import { GameCard } from './GameCard';
import { GamesExplorer } from './GamesExplorer';
import { TrendingRail } from './TrendingRail';

const SITE_URL = 'https://streamertimes.tv';

/** UTC clock label for the freshness line — the page's whole value is currency,
 *  so say when it was built. UTC (not the viewer's zone) keeps SSR and client
 *  markup identical. */
function utcStamp(d: Date): string {
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')} UTC`;
}

/** Games with live streams, most-watched first. Independent of the view's own
 *  ordering — this rail is always "what is happening now". */
function LiveNowSection({ games, lex }: { games: GameWithSlug[]; lex: HubLex }) {
  const live = games
    .filter((g) => (g.live_streamer_count ?? 0) > 0)
    .sort((a, b) => (b.live_viewer_total ?? 0) - (a.live_viewer_total ?? 0))
    .slice(0, 8);
  if (live.length === 0) return null;

  return (
    <section aria-label={lex.games.liveAria} className="mt-8">
      <h2 className="text-xl font-bold text-white">{lex.games.liveRightNow}</h2>
      <ul className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        {live.map((g, i) => (
          <li key={g.slug}>
            {/* First 6 cards are above the fold — LCP candidates. */}
            <GameCard game={g} slug={g.slug} priority={i < 6} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Shared body for every /games hub view (/games, /games/most-streamed,
 * /games/trending). The route files stay thin wrappers that only pick a spec —
 * all three render identically apart from ordering and copy, so keeping one
 * component prevents the views from drifting apart.
 *
 * M22 P3: only /games passes `locale`; the sorted sub-views don't and keep
 * rendering byte-identical English. Registry copy (H1/intro/note/FAQ) is
 * localized for the ROOT view only — non-root views keep the English registry
 * values even under a locale prefix.
 */
export async function GamesHubView({
  spec,
  locale = 'en',
}: {
  spec: GamesHubViewSpec;
  locale?: UiLang;
}) {
  const { games, trending, meta, live, failed, generatedAt } = await loadGamesHub();
  const L = hubLexFor(locale);

  const catalogSlugByName = new Map(games.map((g) => [g.category, g.slug]));
  const slugsByCategory = Object.fromEntries(catalogSlugByName);

  // Sort ONCE here and hand the result to both the grid and the structured
  // data, so the ItemList provably mirrors the render order.
  const sorted = sortGames(games, spec.mode) as GameWithSlug[];

  // Localized registry copy exists only for the root view; the English path
  // keeps using the registry/builders directly so its output stays byte-exact.
  const localizedRoot = spec.segment === null && locale !== 'en';
  const h1 = localizedRoot ? L.gamesRoot.h1 : spec.h1;
  const methodologyNote = localizedRoot ? L.gamesRoot.methodologyNote : spec.methodologyNote;
  const intro = localizedRoot
    ? L.gamesRoot.intro(meta.gameCount, live.liveStreamerCount, live.liveGameCount)
    : buildGamesHubIntro(spec, meta, live);
  const faq = localizedRoot
    ? buildRootGamesFaq(L, {
        gameCount: meta.gameCount,
        liveStreamerCount: live.liveStreamerCount,
        liveGameCount: live.liveGameCount,
        top: sorted[0]
          ? { category: sorted[0].category, count: sorted[0].streamer_count }
          : null,
        second: sorted[1]
          ? { category: sorted[1].category, count: sorted[1].streamer_count }
          : null,
      })
    : buildGamesHubFaq({ spec, meta, live, topGames: sorted });

  const crumbs = [
    { name: L.crumbs.home, url: SITE_URL },
    // The root view IS "Games", so it must be the trailing (URL-less) crumb.
    spec.crumb
      ? { name: L.crumbs.games, url: `${SITE_URL}/games` }
      : { name: L.crumbs.games },
    ...(spec.crumb ? [{ name: spec.crumb }] : []),
  ];
  const breadcrumb = buildBreadcrumbJsonLd(crumbs);
  const collectionPage = buildGamesCollectionPageJsonLd({
    spec,
    entries: buildHubItemListEntries(sorted),
    description: spec.buildDescription(meta),
    dateModified: generatedAt,
  });

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionPage) }}
      />

      {/* Visible breadcrumb: the BreadcrumbList above had no rendered
          counterpart until 2026-07-20. Google expects the markup to describe
          something the user can actually see. */}
      <nav aria-label={L.crumbs.aria} className="text-sm text-text-muted">
        <ol className="flex flex-wrap items-center gap-1">
          <li>
            <Link href={localeHref(locale, '/')} className="hover:text-accent-cyan">
              {L.crumbs.home}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          {spec.crumb ? (
            <>
              <li>
                <Link href={localeHref(locale, '/games')} className="hover:text-accent-cyan">
                  {L.crumbs.games}
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="text-text-secondary">
                {spec.crumb}
              </li>
            </>
          ) : (
            <li aria-current="page" className="text-text-secondary">
              {L.crumbs.games}
            </li>
          )}
        </ol>
      </nav>

      <h1 className="mt-2 text-3xl font-bold text-white">{h1}</h1>
      <p className="mt-3 max-w-2xl text-text-secondary">{intro}</p>

      {failed || games.length === 0 ? (
        <div className="mt-8 gradient-border p-8 text-center">
          <p className="text-accent-pink">{L.games.error}</p>
        </div>
      ) : (
        <>
          <LiveNowSection games={games} lex={L} />
          <TrendingRail
            trending={trending}
            catalogSlugByName={catalogSlugByName}
            locale={locale}
          />

          <div className="mt-10">
            <h2 className="text-xl font-bold text-white">{L.common.allGamesCategories}</h2>
            <GamesExplorer
              games={sorted}
              slugs={slugsByCategory}
              activeMode={spec.mode}
              // Priority only when nothing is live above (else the live rail
              // owns the LCP and extra preloads would compete with it).
              priorityCount={live.liveStreamerCount > 0 ? 0 : 6}
            />
            <p className="mt-3 text-xs text-text-muted">
              {methodologyNote} {L.games.updatedAt(utcStamp(generatedAt))}
            </p>
          </div>

          {faq.length > 0 && (
            <section aria-labelledby="games-hub-faq-heading" className="mt-12 max-w-2xl">
              <h2 id="games-hub-faq-heading" className="text-xl font-bold text-white">
                {L.games.aboutHeading}
              </h2>
              <dl className="mt-4 space-y-5">
                {faq.map(({ q, a }) => (
                  <div key={q}>
                    <dt className="font-semibold text-text-primary">{q}</dt>
                    <dd className="mt-1 text-sm text-text-secondary">{a}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
        </>
      )}

      {/* Cross-links to the sibling hubs. Until 2026-07-20 this page's only
          non-card outbound link was /streamers — /live and /rankings were
          unreachable from here despite being the natural next hop. */}
      <nav aria-label={L.games.relatedAria} className="mt-12 border-t border-border-default pt-6">
        <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          {GAMES_HUB_VIEWS.filter((v) => v.mode !== spec.mode).map((v) => (
            <li key={v.mode}>
              <Link
                href={localeHref(locale, gamesHubPath(v))}
                className="text-accent-cyan hover:text-text-primary"
              >
                {v.h1} →
              </Link>
            </li>
          ))}
          <li>
            <Link
              href={localeHref(locale, '/live')}
              className="text-accent-cyan hover:text-text-primary"
            >
              {L.games.liveRightNow} →
            </Link>
          </li>
          <li>
            <Link
              href={localeHref(locale, '/rankings')}
              className="text-accent-cyan hover:text-text-primary"
            >
              {L.rankings.h1} →
            </Link>
          </li>
          <li>
            <Link
              href={localeHref(locale, '/streamers')}
              className="text-accent-cyan hover:text-text-primary"
            >
              {L.common.browseStreamersAZ} →
            </Link>
          </li>
        </ul>
      </nav>
    </main>
  );
}
