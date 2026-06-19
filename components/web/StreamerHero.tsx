import Image from 'next/image';
import type { PublicStreamer, PublicStreamSlot } from '@/lib/server/partner-api';
import { langCode, dirFor } from '@/lib/seo';
import { AlwaysOnBadge, LiveBadge, PlatformBadge } from './Badges';
import { FavoriteButton } from './FavoriteButton';
import { InitialsAvatar } from './InitialsAvatar';
import { InstallAppCta } from './InstallAppCta';
import { AppQrCode } from './AppQrCode';

interface Props {
  streamer: PublicStreamer;
  liveSlot: PublicStreamSlot | null;
}

export function StreamerHero({ streamer, liveSlot }: Props) {
  const isLive = liveSlot !== null;
  const isAlwaysOn = liveSlot?.is_always_on === true;

  // Mark broadcaster-language text (bio, stream title) so browsers/screen readers
  // treat it correctly while the English UI chrome (and <html lang="en">) stays put.
  // Only set when the language is actually non-English; dir flips only for RTL.
  const code = langCode(streamer.language); // 'en' when null/unknown
  const nativeLang = code !== 'en' ? code : undefined;
  const nativeDir = dirFor(streamer.language);

  return (
    <header className="relative gradient-border p-6 md:p-8">
      <div className="flex flex-col items-center gap-6 md:flex-row md:items-start">
        {streamer.avatar_url ? (
          <Image
            src={streamer.avatar_url}
            alt={`${streamer.name} avatar`}
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
            <h1 className="text-4xl md:text-5xl font-bold text-white">
              {streamer.name}
            </h1>
            <FavoriteButton
              streamerId={streamer.id}
              streamerName={streamer.name}
              size="md"
              className="mt-1 shrink-0"
            />
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-center gap-2 md:justify-start">
            {streamer.platforms.map((p) => (
              <PlatformBadge key={p} platform={p} />
            ))}
            {isLive && <LiveBadge />}
            {isAlwaysOn && <AlwaysOnBadge />}
            {streamer.is_featured && (
              <span className="inline-flex items-center rounded-full border border-accent-pink/40 bg-accent-pink/10 px-2 py-0.5 text-xs font-medium text-accent-pink">
                Featured
              </span>
            )}
          </div>

          {isLive && liveSlot && (
            <p className="mt-4 text-text-secondary">
              <span className="text-text-primary font-semibold">Now streaming:</span>{' '}
              <span lang={nativeLang} dir={nativeDir}>
                {liveSlot.title}
              </span>
              {liveSlot.category ? (
                <span className="text-text-muted"> · {liveSlot.category}</span>
              ) : null}
            </p>
          )}

          {streamer.description && (
            <StreamerDescription
              text={streamer.description}
              lang={nativeLang}
              dir={nativeDir}
            />
          )}

          <div className="mt-4 flex flex-wrap items-center justify-center gap-4 md:justify-start">
            <InstallAppCta compact />
            <AppQrCode className="hidden items-center gap-3 md:flex" />
          </div>
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
      className="mt-4 space-y-3 text-sm leading-relaxed text-text-secondary md:text-base"
    >
      {paragraphs.map((para, i) => (
        <p key={i}>{para}</p>
      ))}
    </div>
  );
}
