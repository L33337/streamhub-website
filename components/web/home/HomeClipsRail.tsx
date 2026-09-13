import type { FeedClip } from '@/lib/feed/types';
import { hubLexFor } from '@/lib/i18n-hub';
import type { UiLang } from '@/lib/i18n-core';
import { languageDisplayName } from '@/lib/format/language';
import { buildHomeClipsPayload } from '@/lib/home/clip-payload';
import { FeedSectionHeader } from '@/components/web/feed/FeedSectionHeader';
import { HomeClipsRailClient } from './HomeClipsRailClient';

/**
 * "Clips of the week" rail (homepage rebuild 2026-07-27, filters 2026-07-31):
 * the week's top clips, played in the feed's ClipLightbox with prev/next
 * playlist nav.
 *
 * Server half — it owns the lexicon (i18n-hub is server-only) and resolves the
 * language codes into names in the VIEWER's locale (chrome, not content —
 * CLAUDE.md D6), so a German visitor picks "Japanisch". The selection state,
 * the lightbox and the cards themselves live in the island below.
 *
 * The clips cross the boundary PACKED (lib/home/clip-payload.ts, 2026-09-14):
 * no database id, no unread fields, urls and thumbnails reduced to the parts
 * that vary, and no per-clip filter items — the island rebuilds all of it
 * before anything renders, so the served HTML is unchanged.
 *
 * No count in the header: the pool is a 500-clip cut of a ~7,600-clip week, so
 * any number here would describe our own cap rather than the week. The
 * dropdown options carry honest, pool-wide counts instead.
 */
export function HomeClipsRail({
  clips,
  names,
  logins,
  languages,
  locale = 'en',
}: {
  clips: FeedClip[];
  names: Record<string, string>;
  /** streamer_id → Twitch login, to rebuild clip urls client-side. */
  logins: Record<string, string>;
  /** streamer_id → raw broadcaster language; the clip itself has none. */
  languages: Record<string, string>;
  locale?: UiLang;
}) {
  if (clips.length === 0) return null;
  const L = hubLexFor(locale);

  const payload = buildHomeClipsPayload(
    clips,
    names,
    languages,
    logins,
    (code) => languageDisplayName(code, locale) ?? code.toUpperCase(),
  );

  return (
    <section aria-label={L.homeFeed.clipsTitle}>
      <FeedSectionHeader title={L.homeFeed.clipsTitle} />
      <HomeClipsRailClient
        clips={payload.clips}
        names={payload.names}
        languages={payload.languages}
        logins={payload.logins}
        languageLabels={payload.languageLabels}
        strings={{
          categoryLabel: L.homeFeed.liveFilterCategory,
          languageLabel: L.homeFeed.liveFilterLanguage,
          allCategories: L.homeFeed.liveFilterAllCategories,
          allLanguages: L.homeFeed.liveFilterAllLanguages,
          // 0..pool, so the island can index straight by its match count and
          // every language keeps its own plural agreement — a `{count}`
          // template would force English "1 clips".
          matchesByCount: Array.from({ length: clips.length + 1 }, (_, count) =>
            L.homeFeed.clipsFilterMatches(count),
          ),
          reset: L.homeFeed.liveFilterReset,
          empty: L.homeFeed.clipsFilterEmpty,
          optionPattern: L.homeFeed.liveFilterOption('{label}', '{count}'),
        }}
      />
    </section>
  );
}
