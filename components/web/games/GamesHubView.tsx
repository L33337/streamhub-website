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
function LiveNowSection({ games }: { games: GameWithSlug[] }) {
  const live = games
    .filter((g) => (g.live_streamer_count ?? 0) > 0)
    .sort((a, b) => (b.live_viewer_total ?? 0) - (a.live_viewer_total ?? 0))
    .slice(0, 8);
  if (live.length === 0) return null;

  return (
    <section aria-label="Games with live streams" className="mt-8">
      <h2 className="text-xl font-bold text-white">Live right now</h2>
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
 */
export async function GamesHubView({ spec }: { spec: GamesHubViewSpec }) {
  const { games, trending, meta, live, failed, generatedAt } = await loadGamesHub();

  const catalogSlugByName = new Map(games.map((g) => [g.category, g.slug]));
  const slugsByCategory = Object.fromEntries(catalogSlugByName);

  // Sort ONCE here and hand the result to both the grid and the structured
  // data, so the ItemList provably mirrors the render order.
  const sorted = sortGames(games, spec.mode) as GameWithSlug[];

  const intro = buildGamesHubIntro(spec, meta, live);
  const faq = buildGamesHubFaq({ spec, meta, live, topGames: sorted });

  const crumbs = [
    { name: 'Home', url: SITE_URL },
    // The root view IS "Games", so it must be the trailing (URL-less) crumb.
    spec.crumb
      ? { name: 'Games', url: `${SITE_URL}/games` }
      : { name: 'Games' },
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
      <nav aria-label="Breadcrumb" className="text-sm text-text-muted">
        <ol className="flex flex-wrap items-center gap-1">
          <li>
            <Link href="/" className="hover:text-accent-cyan">
              Home
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          {spec.crumb ? (
            <>
              <li>
                <Link href="/games" className="hover:text-accent-cyan">
                  Games
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="text-text-secondary">
                {spec.crumb}
              </li>
            </>
          ) : (
            <li aria-current="page" className="text-text-secondary">
              Games
            </li>
          )}
        </ol>
      </nav>

      <h1 className="mt-2 text-3xl font-bold text-white">{spec.h1}</h1>
      <p className="mt-3 max-w-2xl text-text-secondary">{intro}</p>

      {failed || games.length === 0 ? (
        <div className="mt-8 gradient-border p-8 text-center">
          <p className="text-accent-pink">
            Games are temporarily unavailable. Please try again in a moment.
          </p>
        </div>
      ) : (
        <>
          <LiveNowSection games={games} />
          <TrendingRail trending={trending} catalogSlugByName={catalogSlugByName} />

          <div className="mt-10">
            <h2 className="text-xl font-bold text-white">All games &amp; categories</h2>
            <GamesExplorer
              games={sorted}
              slugs={slugsByCategory}
              activeMode={spec.mode}
              // Priority only when nothing is live above (else the live rail
              // owns the LCP and extra preloads would compete with it).
              priorityCount={live.liveStreamerCount > 0 ? 0 : 6}
            />
            <p className="mt-3 text-xs text-text-muted">
              {spec.methodologyNote} Updated {utcStamp(generatedAt)}.
            </p>
          </div>

          {faq.length > 0 && (
            <section aria-labelledby="games-hub-faq-heading" className="mt-12 max-w-2xl">
              <h2 id="games-hub-faq-heading" className="text-xl font-bold text-white">
                About these games
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
      <nav aria-label="Related pages" className="mt-12 border-t border-border-default pt-6">
        <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          {GAMES_HUB_VIEWS.filter((v) => v.mode !== spec.mode).map((v) => (
            <li key={v.mode}>
              <Link href={gamesHubPath(v)} className="text-accent-cyan hover:text-text-primary">
                {v.h1} →
              </Link>
            </li>
          ))}
          <li>
            <Link href="/live" className="text-accent-cyan hover:text-text-primary">
              Live right now →
            </Link>
          </li>
          <li>
            <Link href="/rankings" className="text-accent-cyan hover:text-text-primary">
              Streamer rankings →
            </Link>
          </li>
          <li>
            <Link href="/streamers" className="text-accent-cyan hover:text-text-primary">
              Browse all streamers A–Z →
            </Link>
          </li>
        </ul>
      </nav>
    </main>
  );
}
