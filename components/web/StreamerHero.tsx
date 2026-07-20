import Image from 'next/image';
import type { Platform, PublicStreamer, PublicStreamSlot } from '@/lib/server/partner-api';
import { langCode, dirFor, pickDescription } from '@/lib/seo';
import { resolveUiLang } from '@/lib/i18n-core';
import { uiLexFor } from '@/lib/i18n-ui';
import { AlwaysOnBadge, LiveBadge, PlatformBadge } from './Badges';
import { FavoriteButton } from './FavoriteButton';
import { InitialsAvatar } from './InitialsAvatar';
import { channelUrls } from './WatchButtons';

interface Props {
  streamer: PublicStreamer;
  liveSlot: PublicStreamSlot | null;
  // M22 (D6 keying rule): UI strings follow the VIEWER's locale; the bio and
  // stream title keep the streamer's language marking. Defaults to the
  // streamer's language for pre-M22 call sites.
  uiLanguage?: string | null;
}

export function StreamerHero({ streamer, liveSlot, uiLanguage }: Props) {
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

  return (
    <header className="relative gradient-border p-6 md:p-8">
      <div className="flex flex-col items-center gap-6 md:flex-row md:items-start">
        {streamer.avatar_url ? (
          <Image
            src={streamer.avatar_url}
            alt={L.hero.avatarAlt(streamer.name)}
            width={160}
            height={160}
            sizes="160px"
            className="rounded-full border-2 border-accent-cyan/40 glow-cyan"
          />
        ) : (
          <InitialsAvatar name={streamer.name} size={160} />
        )}

        <div className="flex-1 text-center md:text-left">
          <div className="flex items-start justify-center gap-3 md:justify-start">
            <h1 className="text-2xl md:text-3xl font-bold text-white">
              {streamer.name}
            </h1>
            <FavoriteButton
              streamerId={streamer.id}
              streamerName={streamer.name}
              size="md"
              className="mt-1 shrink-0"
              language={ui ?? undefined}
            />
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-center gap-2 md:justify-start">
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

          {isLive && liveSlot && (
            <p className="mt-4 text-text-secondary">
              <span className="text-text-primary font-semibold">{L.hero.nowStreaming}</span>{' '}
              <span lang={nativeLang} dir={nativeDir}>
                {liveSlot.title}
              </span>
              {liveSlot.category ? (
                <span className="text-text-muted"> · {liveSlot.category}</span>
              ) : null}
            </p>
          )}

          {(() => {
            // M22 P3 (D4): bio follows the best content language for the
            // viewer — original on the streamer's own-language variant,
            // description_en everywhere else (original as last resort). The
            // lang attribute marks the text only when it differs from the
            // page's UI language.
            const picked = pickDescription(streamer, resolveUiLang(ui));
            if (!picked) return null;
            return (
              <StreamerDescription
                text={picked.text}
                lang={picked.lang !== langCode(ui) ? picked.lang : undefined}
                dir={picked.dir}
              />
            );
          })()}
        </div>
      </div>
    </header>
  );
}

/**
 * Renders the AI-generated streamer description, preserving the \n\n paragraph
 * breaks the prompt enforces. Falls back to a single block if no break present.
 */
function StreamerDescription({
  text,
  lang,
  dir,
}: {
  text: string;
  lang?: string;
  dir?: 'rtl';
}) {
  const paragraphs = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  return (
    <div
      lang={lang}
      dir={dir}
      className="mt-4 space-y-3 text-sm leading-relaxed text-text-secondary"
    >
      {paragraphs.map((para, i) => (
        <p key={i}>{para}</p>
      ))}
    </div>
  );
}
