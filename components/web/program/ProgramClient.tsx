'use client';

// Client half of /program — port of the app's Program tab composition
// (StreamHub app/(tabs)/program.tsx + useStreamSlots + useTimeFilter). The
// server component fetches favorites + slots; this component owns ALL derived
// state: the whole pipeline runs in the VIEWER's local timezone, so nothing
// time-grouped is rendered until after mount (skeleton first — no hydration
// mismatch possible). Refresh: 5-min auto (app useAutoRefresh parity) +
// tab-return + manual button; failures keep the current data.
//
// UX round 2026-07-23: 7-day strip, scroll-spied time chips, minute clock
// tick (drives countdowns, the now line and "Updated … ago"), timezone hint,
// legend, next-expected labels on offline rows, empty-day jump, whole-day
// .ics export, aria-live refresh feedback, real h2 section headings.

import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { CalendarArrowDown, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { fetchStreamSlots } from '@/lib/feed/service';
import {
  activeChipForSection,
  buildProgramDay,
  buildStripDays,
  findNextDayWithStreams,
  findNextExpectedSlot,
  findScrollTargetSection,
  formatDateChipLabel,
  formatDayButtonLabel,
  formatLocalTime,
  formatNextExpectedLabel,
  formatUpdatedAgo,
  fromLocalDateInputValue,
  isSameLocalDay,
  nowLineIndex,
  toLocalDateInputValue,
} from '@/lib/program/logic';
import { downloadProgramDayIcs } from '@/lib/program/ics';
import type { StreamSlot } from '@/lib/feed/types';
import type { FavoriteStreamerRow } from '@/lib/supabase/favorites';
import { TimeSelectorBar } from './TimeSelectorBar';
import { ProgramSlotCard } from './ProgramSlotCard';
import { MissedSlotRow } from './MissedSlotRow';
import { OfflineFavoriteRow } from './OfflineFavoriteRow';
import { ProgramLegend } from './ProgramLegend';

const AUTO_REFRESH_MS = 5 * 60 * 1000;
// Local re-render tick: keeps countdowns, the now line and "Updated … ago"
// fresh between network refreshes. Derived state only — no fetch.
const CLOCK_TICK_MS = 60 * 1000;
// Sections use scroll-mt-44 (176px, header + two-row bar); spy threshold
// sits just below so a chip jump marks its own target section active.
const SCROLL_SPY_OFFSET_PX = 190;

function scrollToAnchor(anchorId: string): void {
  document
    .getElementById(anchorId)
    ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * Section divider — the app's SectionDivider (uppercase label between lines),
 * but with a REAL h2 so screen-reader users can navigate by heading.
 */
function SectionDivider({ title, headingId }: { title: string; headingId: string }) {
  return (
    <div className="flex items-center gap-3 pt-6 pb-1">
      <span aria-hidden="true" className="h-px flex-1 bg-border-default" />
      <h2
        id={headingId}
        className="text-xs font-bold uppercase tracking-[0.2em] text-text-muted"
      >
        {title}
      </h2>
      <span aria-hidden="true" className="h-px flex-1 bg-border-default" />
    </div>
  );
}

/** "You are here" marker between today's sections (classic EPG affordance). */
function NowLine({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 pt-5" aria-hidden="true">
      <span className="h-2 w-2 shrink-0 rounded-full bg-accent-cyan motion-safe:animate-pulse" />
      <span className="h-px flex-1 bg-accent-cyan/40" />
      <span className="shrink-0 text-xs font-semibold text-accent-cyan">{label}</span>
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
  const channelById = useMemo(
    () => new Map(favorites.map((f) => [f.id, f])),
    [favorites],
  );

  const [slots, setSlots] = useState<StreamSlot[]>(initialSlots);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  // Local-time grouping only happens after mount (SSR renders the skeleton),
  // so the server never emits timezone-dependent markup.
  const [nowMs, setNowMs] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdatedMs, setLastUpdatedMs] = useState<number | null>(null);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const refreshingRef = useRef(false);
  const lastLoadedRef = useRef(0);
  const announceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const now = Date.now();
    setNowMs(now);
    setSelectedDate(new Date(now));
    // The server fetched the initial slots moments ago.
    setLastUpdatedMs(now);
    lastLoadedRef.current = now;
  }, []);

  useEffect(
    () => () => {
      if (announceTimerRef.current) clearTimeout(announceTimerRef.current);
    },
    [],
  );

  const announce = useCallback((message: string) => {
    setAnnouncement(message);
    if (announceTimerRef.current) clearTimeout(announceTimerRef.current);
    announceTimerRef.current = setTimeout(() => setAnnouncement(''), 5000);
  }, []);

  const refresh = useCallback(
    async (silent: boolean) => {
      if (refreshingRef.current || favoriteIds.length === 0) return;
      refreshingRef.current = true;
      if (!silent) setIsRefreshing(true);
      try {
        const next = await fetchStreamSlots(supabase, favoriteIds);
        setSlots(next);
        const loadedAt = Date.now();
        lastLoadedRef.current = loadedAt;
        setLastUpdatedMs(loadedAt);
        if (!silent) announce('Program updated.');
      } catch (err) {
        // Keep the current data on failure (app parity).
        console.error('[program] refresh failed:', err);
        if (!silent) announce('Refresh failed — showing the last loaded data.');
      } finally {
        refreshingRef.current = false;
        setIsRefreshing(false);
        setNowMs(Date.now());
      }
    },
    [supabase, favoriteIds, announce],
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

  // Minute tick — recomputes derived state from data already on the client.
  useEffect(() => {
    const tick = setInterval(() => {
      if (document.visibilityState === 'visible') setNowMs(Date.now());
    }, CLOCK_TICK_MS);
    return () => clearInterval(tick);
  }, []);

  const now = nowMs === null ? null : new Date(nowMs);
  const day = useMemo(() => {
    if (nowMs === null || !selectedDate) return null;
    return buildProgramDay(slots, favorites, selectedDate, new Date(nowMs));
  }, [slots, favorites, selectedDate, nowMs]);

  // Scroll-spy: the section whose anchor sits above the sticky bar owns the
  // time-chip highlight. Keyed on the section-id signature so the listener is
  // not re-attached on every minute tick.
  const sectionSignature = day ? day.sections.map((s) => s.id).join(',') : '';
  useEffect(() => {
    if (!sectionSignature) {
      setActiveSectionId(null);
      return;
    }
    const ids = sectionSignature.split(',');
    let raf = 0;
    const update = () => {
      raf = 0;
      let current: string | null = null;
      for (const id of ids) {
        const el = document.getElementById(`program-${id}`);
        if (!el) continue;
        if (el.getBoundingClientRect().top <= SCROLL_SPY_OFFSET_PX) current = id;
        else break;
      }
      setActiveSectionId(current);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [sectionSignature]);

  const handleSelectNow = useCallback(() => {
    const nowDate = new Date();
    setNowMs(nowDate.getTime());
    setSelectedDate((prev) =>
      prev && isSameLocalDay(prev, nowDate) ? prev : nowDate,
    );
    scrollToAnchor('program-top');
  }, []);

  const handleSelectHour = useCallback(
    (hour: number) => {
      const target = findScrollTargetSection(day?.sections ?? [], hour);
      if (target) scrollToAnchor(`program-${target}`);
    },
    [day],
  );

  const handleSelectDay = useCallback((key: string) => {
    setNowMs(Date.now());
    setSelectedDate(fromLocalDateInputValue(key));
    scrollToAnchor('program-top');
  }, []);

  const handleSelectDate = useCallback((value: string) => {
    setNowMs(Date.now());
    setSelectedDate(fromLocalDateInputValue(value));
    scrollToAnchor('program-top');
  }, []);

  // "Next: Tomorrow ~8pm" labels for the Offline-today rows — computed over
  // the FULL fetched slot set (all days), not just the selected day.
  const nextExpectedLabels = useMemo(() => {
    const map = new Map<string, string>();
    if (!day || nowMs === null) return map;
    const nowDate = new Date(nowMs);
    for (const favorite of day.offlineFavorites) {
      const next = findNextExpectedSlot(slots, favorite.id, nowDate);
      if (next) map.set(favorite.id, formatNextExpectedLabel(next, nowDate));
    }
    return map;
  }, [day, slots, nowMs]);

  // Whole-day .ics export: the visible day's upcoming slots that are still in
  // the future (cancelled/pause markers and overdue predictions excluded).
  const exportableSlots = useMemo(() => {
    if (!day || nowMs === null) return [];
    return day.sections
      .filter((s) => s.type === 'upcoming')
      .flatMap((s) => s.slots)
      .filter(
        (s) =>
          s.slotKind !== 'cancelled' && new Date(s.startTime).getTime() > nowMs,
      );
  }, [day, nowMs]);

  const timeZone = useMemo(() => {
    if (nowMs === null) return null;
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone ?? null;
    } catch {
      return null;
    }
  }, [nowMs === null]); // eslint-disable-line react-hooks/exhaustive-deps -- only the mounted flag matters

  if (favorites.length === 0) {
    return <EmptyFavoritesState />;
  }

  const loading = !day || !now || !selectedDate;
  const hasStreams = !loading && day.sections.length > 0;
  const hasMissed = !loading && day.missedSlots.length > 0;
  const hasOffline = !loading && day.offlineFavorites.length > 0;
  const isToday = !loading && isSameLocalDay(selectedDate, now);

  const stripDays = loading ? [] : buildStripDays(now);
  const selectedDayKey = loading ? null : toLocalDateInputValue(selectedDate);
  const customDateLabel =
    loading || stripDays.some((d) => d.key === selectedDayKey)
      ? null
      : formatDateChipLabel(selectedDate, now);
  const activeTimeChip = loading
    ? null
    : activeChipForSection(activeSectionId, day.sections, isToday);
  const nowIdx = loading ? null : nowLineIndex(day.sections, selectedDate, now);
  const nextStreamDay =
    !loading && !hasStreams && !hasMissed
      ? findNextDayWithStreams(slots, selectedDate, now)
      : null;

  return (
    <div id="program-top" className="scroll-mt-24">
      <p aria-live="polite" role="status" className="sr-only">
        {announcement}
      </p>

      <TimeSelectorBar
        days={stripDays}
        selectedDayKey={selectedDayKey}
        onSelectDay={handleSelectDay}
        customDateLabel={customDateLabel}
        selectedDateValue={loading ? '' : toLocalDateInputValue(selectedDate)}
        onSelectDate={handleSelectDate}
        activeTimeChip={activeTimeChip}
        onSelectNow={handleSelectNow}
        onSelectHour={handleSelectHour}
      />

      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <p className="text-xs text-text-muted">
          {now !== null
            ? `All times in your local time${timeZone ? ` (${timeZone})` : ''}`
            : ' '}
        </p>
        <div className="flex items-center gap-3">
          {lastUpdatedMs !== null && nowMs !== null && (
            <span
              className="text-xs text-text-muted"
              title={`Last updated ${new Date(lastUpdatedMs).toLocaleTimeString()}`}
            >
              Updated {formatUpdatedAgo(lastUpdatedMs, nowMs)}
            </span>
          )}
          <button
            type="button"
            onClick={() => {
              if (selectedDate && exportableSlots.length > 0) {
                downloadProgramDayIcs(exportableSlots, selectedDate);
              }
            }}
            disabled={exportableSlots.length === 0}
            title="Download this day's upcoming streams as a calendar file"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-muted transition-colors hover:text-accent-cyan disabled:opacity-50"
          >
            <CalendarArrowDown size={13} aria-hidden="true" />
            Day .ics
          </button>
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
      </div>

      <ProgramLegend />

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
                here.
              </p>
              {nextStreamDay ? (
                <button
                  type="button"
                  onClick={() =>
                    handleSelectDay(toLocalDateInputValue(nextStreamDay))
                  }
                  className="mt-5 inline-flex items-center gap-1.5 rounded-lg border border-accent-cyan/60 bg-accent-cyan/10 px-4 py-2 text-sm font-semibold text-accent-cyan transition-colors hover:bg-accent-cyan/20"
                >
                  Next streams: {formatDayButtonLabel(nextStreamDay, now)} →
                </button>
              ) : (
                <p className="mt-2 text-sm text-text-muted">
                  Try another date or check back later.
                </p>
              )}
            </div>
          )}

          {day.sections.map((section, index) => (
            <Fragment key={section.id}>
              {nowIdx === index && <NowLine label={formatLocalTime(now)} />}
              <section
                id={`program-${section.id}`}
                className="scroll-mt-44"
                aria-labelledby={`program-heading-${section.id}`}
              >
                <SectionDivider
                  title={section.title}
                  headingId={`program-heading-${section.id}`}
                />
                <ul className="space-y-3">
                  {section.slots.map((slot) => (
                    <li key={slot.id}>
                      <ProgramSlotCard
                        slot={slot}
                        now={now}
                        channel={channelById.get(slot.streamerId)}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            </Fragment>
          ))}
          {nowIdx !== null && nowIdx === day.sections.length && (
            <NowLine label={formatLocalTime(now)} />
          )}

          {hasMissed && (
            <section
              id="program-missed"
              className="scroll-mt-44"
              aria-labelledby="program-heading-missed"
            >
              <SectionDivider title="Missed" headingId="program-heading-missed" />
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
              className="scroll-mt-44"
              aria-labelledby="program-heading-offline"
            >
              <SectionDivider
                title="Offline today"
                headingId="program-heading-offline"
              />
              <ul className="space-y-3">
                {day.offlineFavorites.map((streamer) => (
                  <li key={streamer.id}>
                    <OfflineFavoriteRow
                      streamer={streamer}
                      nextExpectedLabel={nextExpectedLabels.get(streamer.id) ?? null}
                    />
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
