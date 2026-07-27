import Image from 'next/image';
import Link from 'next/link';
import type {
  Platform,
  PublicStreamer,
  PublicStreamerRankings,
  PublicStreamSlot,
} from '@/lib/server/partner-api';
import { langCode, dirFor, pickDescription } from '@/lib/seo';
import { localeHref, resolveUiLang } from '@/lib/i18n-core';
import { uiLexFor } from '@/lib/i18n-ui';
import { buildStreamerRankingRows } from '@/lib/streamer-rankings';
import { AlwaysOnBadge, LiveBadge, PlatformBadge } from './Badges';
import { CollapsibleBio } from './CollapsibleBio';
import { FavoriteButton } from './FavoriteButton';
import { HeroNextStream } from './HeroNextStream';
import { InitialsAvatar } from './InitialsAvatar';
import { channelUrls, WatchButtons } from './WatchButtons';

/**
 * Ranks below this are not social proof — "#487 most followed" undersells a
 * channel rather than selling it. 100 also matches the first leaderboard page.
 */
const HERO_RANK_CEILING = 100;
/** Two chips at most: this is a teaser for the full Rankings block below. */
const HERO_RANK_CHIPS = 2;

interface Props {
  streamer: PublicStreamer;
  liveSlot: PublicStreamSlot | null;
  /** Earliest real upcoming slot — drives the above-the-fold "next stream" answer. */
  nextSlot?: PublicStreamSlot | null;
  /** Placements for the hero's teaser chips; the full block renders lower down. */
  rankings?: PublicStreamerRankings | null;
  // M22 (D6 keying rule): UI strings follow the VIEWER's locale; the bio and
  // stream title keep the streamer's language marking. Defaults to the
  // streamer's language for pre-M22 call sites.
  uiLanguage?: string | null;
}

export function StreamerHero({
  streamer,
  liveSlot,
  nextSlot = null,
  rankings = null,
  uiLanguage,
}: Props) {
  const isLive = liveSlot !== null;
  const isAlwaysOn = liveSlot?.is_always_on === true;
  const ui = uiLanguage ?? streamer.language;

  // Mark broadcaster-language text (bio, stream title) so browsers/screen
  // readers treat it correctly: the surrounding page is localized to the
  // VIEWER's locale, so native-language content needs its own lang/dir.
  const code = langCode(streamer.language); // 'en' when null/unknown
  const nativeLang = code !== langCode(ui) ? code : undefined;
  const nativeDir = dirFor(streamer.language);
  const L = uiLexFor(ui);

  // The channel links now live behind the Twitch/YouTube platform badges under
  // the name (replacing the removed inline "Twitch ↗ · YouTube ↗" links). A null
  // id → the badge falls back to a plain, non-clickable pill.
  const { twitchUrl, youtubeUrl } = channelUrls({
    twitchLogin: streamer.twitch_login,
    youtubeChannelId: streamer.youtube_channel_id,
  });
  const channelHref = (p: Platform): string | undefined =>
    (p === 'twitch' ? twitchUrl : youtubeUrl) ?? undefined;

  // M22 P3 (D4): bio follows the best content language for the viewer —
  // original on the streamer's own-language variant, description_en everywhere
  // else (original as last resort). The lang attribute marks the text only when
  // it differs from the page's UI language.
  const picked = pickDescription(streamer, resolveUiLang(ui));
  const bioParagraphs = picked
    ? picked.text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
    : [];

  // Best placements first — the API's own order is leaderboard order, so
  // without the sort a #4 could sit behind a #90.
  const rankChips = buildStreamerRankingRows(rankings, { metric: L.streamerRankings.metric })
    .filter((row) => row.rank <= HERO_RANK_CEILING)
    .sort((a, b) => a.rank - b.rank)
    .slice(0, HERO_RANK_CHIPS);

  // The next-stream answer counts too: on an offline streamer with no bio it is
  // the only thing in the second row, and the most important one.
  const hasSecondRow =
    isLive || nextSlot !== null || bioParagraphs.length > 0 || rankChips.length > 0;

  return (
    <header className="relative gradient-border p-4 sm:p-6 md:p-8">
      {/*
        Two-column grid instead of the old stacked flex column. Below md the
        avatar and the name share row 1 (they used to eat two full rows above
        the fold) while the live line and bio span the full width in row 2; at
        md the avatar spans both rows and the desktop layout is unchanged.
      */}
      <div className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-3 md:items-start md:gap-x-6">
        {streamer.avatar_url ? (
          <Image
            src={streamer.avatar_url}
            alt={L.hero.avatarAlt(streamer.name)}
            width={160}
            height={160}
            sizes="(min-width: 768px) 160px, 80px"
            className={`h-20 w-20 shrink-0 rounded-full border-2 border-accent-cyan/40 glow-cyan md:h-40 md:w-40 ${
              hasSecondRow ? 'md:row-span-2' : ''
            }`}
          />
        ) : (
          // Two instances rather than one responsive one: InitialsAvatar sizes
          // itself with an inline style, which a utility class cannot override.
          <div className={hasSecondRow ? 'md:row-span-2' : undefined}>
            <InitialsAvatar name={streamer.name} size={80} className="md:hidden" />
            <InitialsAvatar
              name={streamer.name}
              size={160}
              className="hidden md:inline-flex"
            />
          </div>
        )}

        <div className="min-w-0">
          <div className="flex items-start gap-3">
            <h1 className="text-2xl font-bold text-white md:text-3xl">{streamer.name}</h1>
            <FavoriteButton
              streamerId={streamer.id}
              streamerName={streamer.name}
              size="md"
              className="mt-1 shrink-0"
              language={ui ?? undefined}
            />
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2 md:mt-3">
            {streamer.platforms.map((p) => (
              <PlatformBadge
                key={p}
                platform={p}
                href={channelHref(p)}
                language={ui ?? undefined}
              />
            ))}
            {isLive && <LiveBadge language={ui ?? undefined} />}
            {isAlwaysOn && <AlwaysOnBadge />}
          </div>
        </div>

        {hasSecondRow && (
          <div className="col-span-2 min-w-0 md:col-span-1">
            {isLive && liveSlot && (
              <p className="text-text-secondary">
                <span className="font-semibold text-text-primary">
                  {L.hero.nowStreaming}
                </span>{' '}
                <span lang={nativeLang} dir={nativeDir}>
                  {liveSlot.title}
                </span>
                {liveSlot.category ? (
                  <span className="text-text-muted"> · {liveSlot.category}</span>
                ) : null}
              </p>
            )}

            {/* Mid-stream the only thing that matters is watching, so the
                action is promoted from a small platform badge to real buttons. */}
            {isLive && (
              <WatchButtons
                twitchLogin={streamer.twitch_login}
                youtubeChannelId={streamer.youtube_channel_id}
                grow={false}
                language={resolveUiLang(ui)}
                className="mt-3 flex flex-col gap-2 sm:flex-row sm:gap-3"
              />
            )}
            {/* Offline: the headline answer, above the chips and the bio. */}
            {!isLive && nextSlot && (
              <div className="mt-3">
                <HeroNextStream nextSlot={nextSlot} language={resolveUiLang(ui)} />
              </div>
            )}

            {rankChips.length > 0 && (
              <ul className="mt-2 flex flex-wrap gap-2">
                {rankChips.map((row) => {
                  const body = (
                    <>
                      <span className="font-bold tabular-nums text-accent-cyan">
                        #{row.rank}
                      </span>{' '}
                      <span className="text-text-secondary">{row.label}</span>
                    </>
                  );
                  const chip =
                    'inline-flex items-center gap-1 rounded-full border border-border-default bg-background-elevated px-2.5 py-1 text-xs';
                  return (
                    <li key={row.key}>
                      {row.href ? (
                        <Link
                          href={localeHref(resolveUiLang(ui), row.href)}
                          className={`${chip} transition-colors hover:border-accent-cyan/60`}
                          aria-label={L.streamerRankings.rowAria(
                            row.rank,
                            String(row.total),
                            row.label,
                          )}
                        >
                          {body}
                        </Link>
                      ) : (
                        <span className={chip}>{body}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            {bioParagraphs.length > 0 && picked && (
              <div className="mt-3">
                <CollapsibleBio
                  paragraphs={bioParagraphs}
                  lang={picked.lang !== langCode(ui) ? picked.lang : undefined}
                  dir={picked.dir}
                  moreLabel={L.hero.showMore}
                  lessLabel={L.hero.showLess}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
