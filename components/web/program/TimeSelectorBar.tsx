'use client';

// Program navigation bar (UX round 2026-07-23) — two rows, sticky below the
// site header:
//   Row 1: 7-day strip (Today / Tomorrow / "Sat 26" …) + a calendar chip for
//          arbitrary dates (native <input type="date"> overlay, showPicker()
//          with a focus fallback for older Safari). Predictions reach ~7 days
//          out, so the strip is the primary day navigation; the picker is the
//          fallback for anything else (including past days).
//   Row 2: Now / 4pm / 8pm scroll shortcuts. Their active state is OWNED by
//          the scroll-spy in ProgramClient (position, not selection) — they
//          are jump links, not filters.

import { useRef } from 'react';
import { Calendar } from 'lucide-react';
import type { ProgramTimeChip, StripDay } from '@/lib/program/logic';

function chipClass(active: boolean): string {
  return `inline-flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors ${
    active
      ? 'border-accent-cyan bg-accent-cyan/15 text-accent-cyan glow-cyan'
      : 'border-border-default bg-background-elevated text-text-secondary hover:border-accent-cyan/40 hover:text-text-primary'
  }`;
}

export function TimeSelectorBar({
  days,
  selectedDayKey,
  onSelectDay,
  customDateLabel,
  selectedDateValue,
  onSelectDate,
  activeTimeChip,
  onSelectNow,
  onSelectHour,
}: {
  /** 7-day strip (buildStripDays); empty while the client clock isn't mounted. */
  days: StripDay[];
  /** yyyy-mm-dd of the selected day (matches StripDay.key). */
  selectedDayKey: string | null;
  onSelectDay: (key: string) => void;
  /** 'Jul 5' when the selected date is OUTSIDE the strip; null otherwise. */
  customDateLabel: string | null;
  /** yyyy-mm-dd value for the native date input. */
  selectedDateValue: string;
  onSelectDate: (value: string) => void;
  /** Scroll-spy state from ProgramClient; null = no chip highlighted. */
  activeTimeChip: ProgramTimeChip | null;
  onSelectNow: () => void;
  onSelectHour: (hour: number) => void;
}) {
  const dateInputRef = useRef<HTMLInputElement>(null);

  const openDatePicker = () => {
    const input = dateInputRef.current;
    if (!input) return;
    // showPicker needs a user gesture and is missing in older Safari — the
    // focus fallback at least lets keyboard entry work there.
    try {
      input.showPicker();
    } catch {
      input.focus();
    }
  };

  return (
    <nav
      aria-label="Program navigation"
      className="sticky top-[var(--header-height)] z-20 -mx-4 border-b border-border-default bg-background/95 px-4 py-2.5 backdrop-blur"
    >
      {/* Day strip — horizontally scrollable on narrow screens, no wrap. */}
      <div
        aria-label="Pick a day"
        role="group"
        className="flex items-center gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {days.length > 0 ? (
          days.map((day) => (
            <button
              key={day.key}
              type="button"
              className={chipClass(customDateLabel === null && day.key === selectedDayKey)}
              aria-current={
                customDateLabel === null && day.key === selectedDayKey ? 'date' : undefined
              }
              onClick={() => onSelectDay(day.key)}
            >
              {day.label}
            </button>
          ))
        ) : (
          // Pre-mount placeholder (SSR + first paint) — replaced as soon as
          // the client clock exists. Keeps the bar height stable.
          <span className={chipClass(true)} aria-hidden="true">
            Today
          </span>
        )}
        <span className="relative shrink-0">
          <button
            type="button"
            className={chipClass(customDateLabel !== null)}
            onClick={openDatePicker}
            aria-current={customDateLabel !== null ? 'date' : undefined}
            aria-label={
              customDateLabel
                ? `Pick any date (currently ${customDateLabel})`
                : 'Pick any date'
            }
          >
            <Calendar size={14} aria-hidden="true" />
            {customDateLabel}
          </button>
          {/* Invisible overlay input: mouse/touch clicks land here (opens the
              native picker); keyboard users reach the button underneath, whose
              Enter/Space triggers openDatePicker. */}
          <input
            ref={dateInputRef}
            type="date"
            value={selectedDateValue}
            onClick={(e) => {
              try {
                e.currentTarget.showPicker();
              } catch {
                /* older Safari: fall back to the input's native behavior */
              }
            }}
            onChange={(e) => {
              if (e.target.value) onSelectDate(e.target.value);
            }}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            tabIndex={-1}
            aria-hidden="true"
          />
        </span>
      </div>

      {/* Time jump row — scroll shortcuts with scroll-spy highlighting. */}
      <div aria-label="Jump to time" role="group" className="mt-2 flex items-center gap-2">
        <button
          type="button"
          className={chipClass(activeTimeChip === 'now')}
          onClick={onSelectNow}
        >
          Now
        </button>
        <button
          type="button"
          className={chipClass(activeTimeChip === 'hour-16')}
          onClick={() => onSelectHour(16)}
        >
          4pm
        </button>
        <button
          type="button"
          className={chipClass(activeTimeChip === 'hour-20')}
          onClick={() => onSelectHour(20)}
        >
          8pm
        </button>
      </div>
    </nav>
  );
}
