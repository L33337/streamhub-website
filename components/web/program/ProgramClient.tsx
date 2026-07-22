'use client';

// Client half of /program — port of the app's Program tab composition
// (StreamHub app/(tabs)/program.tsx + useStreamSlots + useTimeFilter). The
// server component fetches favorites + slots; this component owns ALL derived
// state: the whole pipeline runs in the VIEWER's local timezone, so nothing
// time-grouped is rendered until after mount (skeleton first — no hydration
// mismatch possible). Refresh: 5-min auto (app useAutoRefresh parity) +
// tab-return + manual button; failures keep the current data.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { fetchStreamSlots } from '@/lib/feed/service';
import {
  buildProgramDay,
  formatDateChipLabel,
  isSameLocalDay,
} from '@/lib/program/logic';
import type { StreamSlot } from '@/lib/feed/types';
import type { FavoriteStreamerRow } from '@/lib/supabase/favorites';
import type { ProgramSection } from '@/lib/program/types';
import { findScrollTargetSection } from '@/lib/program/logic';
import { TimeSelectorBar, type TimeChip } from './TimeSelectorBar';
import { ProgramSlotCard } from './ProgramSlotCard';
import { MissedSlotRow } from './MissedSlotRow';
import { OfflineFavoriteRow } from './OfflineFavoriteRow';

const AUTO_REFRESH_MS = 5 * 60 * 1000;

function toLocalDateInputValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function fromLocalDateInputValue(value: string): Date {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function scrollToAnchor(anchorId: string): void {
  document
    .getElementById(anchorId)
    ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/** Section divider — the app's SectionDivider (uppercase label between lines). */
function SectionDivider({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 pt-6 pb-1" aria-hidden="true">
      <span className="h-px flex-1 bg-border-default" />
      <span className="text-xs font-bold uppercase tracking-[0.2em] text-text-muted">
        {title}
      </span>
      <span className="h-px flex-1 bg-border-default" />
    </div>
  );
}

function SkeletonList() {
  return (
    <div className="mt-6 space-y-3" aria-hidden="true">
      {Array.from({ length: 5 }, (_, i) => (
        <div
          key={i}
          className="h-28 animate-pulse rounded-xl bg-background-elevated"
        />
      ))}
    </div>
  );
}

function EmptyFavoritesState() {
  return (
    <div className="mt-10 gradient-border p-8 text-center">
      <h2 className="text-xl font-bold text-text-primary">No favorites yet</h2>
      <p className="mx-auto mt-3 max-w-md text-text-secondary">
        Your program shows the schedule of streamers you follow. Add some
        favorites to fill it up — they sync with the Streamer Times mobile app.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link
          href="/search"
          className="inline-flex items-center rounded-lg border border-accent-cyan/60 bg-accent-cyan/10 px-4 py-2 text-sm font-semibold text-accent-cyan transition-colors hover:bg-accent-cyan/20"
        >
          Search streamers
        </Link>
        <Link
          href="/favorites"
          className="inline-flex items-center rounded-lg border border-border-default bg-background-elevated px-4 py-2 text-sm font-semibold text-text-primary transition-colors hover:border-accent-cyan/40"
        >
          My favorites
        </Link>
      </div>
    </div>
  );
}

export function ProgramClient({
  initialSlots,
  favorites,
}: {
  initialSlots: StreamSlot[];
  favorites: FavoriteStreamerRow[];
}) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const favoriteIds = useMemo(() => favorites.map((f) => f.id), [favorites]);

  const [slots, setSlots] = useState<StreamSlot[]>(initialSlots);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedChip, setSelectedChip] = useState<TimeChip>('now');
  // Local-time grouping only happens after mount (SSR renders the skeleton),
  // so the server never emits timezone-dependent markup.
  const [nowMs, setNowMs] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshingRef = useRef(false);
  const lastLoadedRef = useRef(0);

  useEffect(() => {
    const now = Date.now();
    setNowMs(now);
    setSelectedDate(new Date(now));
    lastLoadedRef.current = now;
  }, []);

  const refresh = useCallback(
    async (silent: boolean) => {
      if (refreshingRef.current || favoriteIds.length === 0) return;
      refreshingRef.current = true;
      if (!silent) setIsRefreshing(true);
      try {
        const next = await fetchStreamSlots(supabase, favoriteIds);
        setSlots(next);
        lastLoadedRef.current = Date.now();
      } catch (err) {
        // Keep the current data on failure (app parity).
        console.error('[program] refresh failed:', err);
      } finally {
        refreshingRef.current = false;
        setIsRefreshing(false);
        setNowMs(Date.now());
      }
    },
    [supabase, favoriteIds],
  );

  // 5-min auto-refresh while visible + refresh when returning to a tab that
  // has been hidden for 5+ minutes (app useAutoRefresh parity).
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') void refresh(true);
    }, AUTO_REFRESH_MS);
    const onVisibility = () => {
      if (
        document.visibilityState === 'visible' &&
        Date.now() - lastLoadedRef.current >= AUTO_REFRESH_MS
      ) {
        void refresh(true);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [refresh]);

  const now = nowMs === null ? null : new Date(nowMs);
  const day = useMemo(() => {
    if (nowMs === null || !selectedDate) return null;
    return buildProgramDay(slots, favorites, selectedDate, new Date(nowMs));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `now` is derived from nowMs
  }, [slots, favorites, selectedDate, nowMs]);

  const handleSelectNow = useCallback(() => {
    setSelectedChip('now');
    const nowDate = new Date();
    setNowMs(nowDate.getTime());
    setSelectedDate((prev) =>
      prev && isSameLocalDay(prev, nowDate) ? prev : nowDate,
    );
    scrollToAnchor('program-top');
  }, []);

  const handleSelectHour = useCallback(
    (hour: number) => {
      setSelectedChip(hour === 16 ? 'hour-16' : 'hour-20');
      const sections: ProgramSection[] = day?.sections ?? [];
      const target = findScrollTargetSection(sections, hour);
      if (target) scrollToAnchor(`program-${target}`);
    },
    [day],
  );

  const handleSelectDate = useCallback((value: string) => {
    setSelectedChip('date');
    setNowMs(Date.now());
    setSelectedDate(fromLocalDateInputValue(value));
  }, []);

  if (favorites.length === 0) {
    return <EmptyFavoritesState />;
  }

  const loading = !day || !now || !selectedDate;
  const hasStreams = !loading && day.sections.length > 0;
  const hasMissed = !loading && day.missedSlots.length > 0;
  const hasOffline = !loading && day.offlineFavorites.length > 0;

  return (
    <div id="program-top" className="scroll-mt-24">
      <TimeSelectorBar
        selectedChip={selectedChip}
        dateChipLabel={
          loading ? 'today' : formatDateChipLabel(selectedDate, now)
        }
        selectedDateValue={
          loading ? '' : toLocalDateInputValue(selectedDate)
        }
        onSelectNow={handleSelectNow}
        onSelectHour={handleSelectHour}
        onSelectDate={handleSelectDate}
      />

      <div className="mt-2 flex justify-end">
        <button
          type="button"
          onClick={() => void refresh(false)}
          disabled={isRefreshing}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-muted transition-colors hover:text-accent-cyan disabled:opacity-50"
          aria-label="Refresh program"
        >
          <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {loading ? (
        <SkeletonList />
      ) : (
        <>
          {!hasStreams && !hasMissed && (
            <div className="mt-8 rounded-xl border border-border-default bg-background-elevated p-8 text-center">
              <h2 className="text-lg font-bold text-text-primary">
                No streams on this day
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-text-secondary">
                None of your favorite streamers have a stream or prediction
                here. Try another date or check back later.
              </p>
            </div>
          )}

          {day.sections.map((section) => (
            <section
              key={section.id}
              id={`program-${section.id}`}
              className="scroll-mt-32"
              aria-label={section.title}
            >
              <SectionDivider title={section.title} />
              <ul className="space-y-3">
                {section.slots.map((slot) => (
                  <li key={slot.id}>
                    <ProgramSlotCard slot={slot} now={now} />
                  </li>
                ))}
              </ul>
            </section>
          ))}

          {hasMissed && (
            <section id="program-missed" className="scroll-mt-32" aria-label="Missed">
              <SectionDivider title="Missed" />
              <ul className="space-y-3">
                {day.missedSlots.map((slot) => (
                  <li key={slot.id}>
                    <MissedSlotRow slot={slot} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {hasOffline && (
            <section
              id="program-offline"
              className="scroll-mt-32"
              aria-label="Offline today"
            >
              <SectionDivider title="Offline today" />
              <ul className="space-y-3">
                {day.offlineFavorites.map((streamer) => (
                  <li key={streamer.id}>
                    <OfflineFavoriteRow streamer={streamer} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
