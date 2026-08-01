'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { X, Play, Quote, CalendarClock, CalendarX2, BarChart3 } from 'lucide-react';
import { logFeedEvent } from '@/lib/feed/events';
import { sizedCdnImageUrl } from '@/lib/format/image-size';

export type BriefingCardKind = 'clip' | 'fan-moment' | 'today' | 'changes' | 'recap';

export interface BriefingCard {
  kind: BriefingCardKind;
  headline: string;
  body?: string;
  thumbnailUrl?: string;
  lines?: string[];
  /** clip card CTA target (opens the Phase-1 lightbox via the caller) */
  clipId?: string;
}

const KIND_ICON = {
  clip: Play,
  'fan-moment': Quote,
  today: CalendarClock,
  changes: CalendarX2,
  recap: BarChart3,
} as const;

/**
 * Daily Briefing story overlay (M18 Phase 7, app parity): click right = next,
 * left third = previous, X or finishing = close. Cards are composed by
 * FeedClient from data the feed already loaded.
 */
export function BriefingOverlay({
  cards,
  onClose,
  onWatchClip,
}: {
  cards: BriefingCard[];
  onClose: () => void;
  onWatchClip: (clipId: string) => void;
}) {
  const [index, setIndex] = useState(0);
  const openedAtRef = useRef(0);

  useEffect(() => {
    openedAtRef.current = Date.now();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  const advance = useCallback(() => {
    const current = cards[index];
    if (current) {
      logFeedEvent({ event: 'story_advance', itemType: 'info', itemId: current.kind });
    }
    if (index >= cards.length - 1) {
      logFeedEvent({
        event: 'story_complete',
        itemType: 'info',
        itemId: 'briefing',
        durationSeconds: Math.max(0, Math.round((Date.now() - openedAtRef.current) / 1000)),
      });
      onClose();
      return;
    }
    setIndex((i) => i + 1);
  }, [cards, index, onClose]);

  const goBack = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    setIndex((i) => Math.max(0, i - 1));
  }, []);

  const card = cards[index];
  if (!card) return null;
  const Icon = KIND_ICON[card.kind];

  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col bg-background/95 backdrop-blur"
      role="dialog"
      aria-modal="true"
      aria-label="Daily briefing"
    >
      <div className="mx-auto flex w-full max-w-lg gap-1 px-4 pt-4">
        {cards.map((_, barIndex) => (
          <div
            key={`bar-${barIndex}`}
            className={`h-1 flex-1 rounded-full ${barIndex <= index ? 'bg-accent-cyan' : 'bg-background-highlight'}`}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={onClose}
        aria-label="Close briefing"
        className="absolute right-4 top-8 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-background-elevated text-text-secondary transition-colors hover:text-white"
      >
        <X size={18} />
      </button>

      <button
        type="button"
        onClick={advance}
        className="relative mx-auto flex w-full max-w-lg flex-1 cursor-pointer items-center px-4 text-left focus-visible:outline-none"
        aria-label="Next card"
      >
        <button
          type="button"
          onClick={goBack}
          aria-label="Previous card"
          className="absolute bottom-0 left-0 top-0 w-1/3 cursor-pointer focus-visible:outline-none"
        />
        <div className="w-full rounded-2xl border border-border-default bg-background-elevated p-6">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-background-highlight">
            <Icon size={20} className="text-accent-cyan" strokeWidth={1.75} />
          </div>
          <h2 className="text-xl font-bold text-white">{card.headline}</h2>
          {card.thumbnailUrl ? (
            <div className="relative mt-4 aspect-video w-full overflow-hidden rounded-lg bg-background-highlight">
              <Image
                src={sizedCdnImageUrl(card.thumbnailUrl, 320)}
                alt=""
                fill
                unoptimized
                // Was missing entirely, so this defaulted to 100vw and asked
                // for the widest bucket in a modal card that never exceeds
                // ~320px.
                sizes="320px"
                className="object-cover"
              />
            </div>
          ) : null}
          {card.body ? (
            <p className="mt-3 text-[15px] leading-relaxed text-text-secondary">{card.body}</p>
          ) : null}
          {card.lines?.map((line, lineIndex) => (
            <p key={`line-${lineIndex}`} className="mt-1.5 truncate text-sm text-text-secondary">
              {line}
            </p>
          ))}
          {card.kind === 'clip' && card.clipId ? (
            <span
              role="button"
              tabIndex={0}
              onClick={(event) => {
                event.stopPropagation();
                onWatchClip(card.clipId as string);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.stopPropagation();
                  onWatchClip(card.clipId as string);
                }
              }}
              className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-accent-cyan/60 px-4 py-1.5 text-sm font-semibold text-accent-cyan transition-colors hover:bg-accent-cyan/10"
            >
              <Play size={13} strokeWidth={2} />
              Watch clip
            </span>
          ) : null}
        </div>
      </button>

      <p className="pb-6 text-center text-xs text-text-muted">Click to continue</p>
    </div>
  );
}
