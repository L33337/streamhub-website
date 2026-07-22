'use client';

// Time-selector chip bar — port of the app's TimeSelector (StreamHub
// src/components/TimeSelector.tsx + useTimeFilter.ts): Now / 4pm / 8pm scroll
// to their section, the date chip opens a native date picker and shows the
// picked date ('today' or 'Jan 5'). Sticky below the site header.

import { useRef } from 'react';
import { Calendar } from 'lucide-react';

export type TimeChip = 'now' | 'hour-16' | 'hour-20' | 'date';

function chipClass(active: boolean): string {
  return `inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors ${
    active
      ? 'border-accent-cyan bg-accent-cyan/15 text-accent-cyan glow-cyan'
      : 'border-border-default bg-background-elevated text-text-secondary hover:border-accent-cyan/40 hover:text-text-primary'
  }`;
}

export function TimeSelectorBar({
  selectedChip,
  dateChipLabel,
  selectedDateValue,
  onSelectNow,
  onSelectHour,
  onSelectDate,
}: {
  selectedChip: TimeChip;
  /** 'today' or 'Jan 5' (formatDateChipLabel). */
  dateChipLabel: string;
  /** yyyy-mm-dd value for the native date input. */
  selectedDateValue: string;
  onSelectNow: () => void;
  onSelectHour: (hour: number) => void;
  onSelectDate: (value: string) => void;
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
      aria-label="Jump to time"
      className="sticky top-[var(--header-height)] z-20 -mx-4 border-b border-border-default bg-background/95 px-4 py-3 backdrop-blur"
    >
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={chipClass(selectedChip === 'now')} onClick={onSelectNow}>
          Now
        </button>
        <button
          type="button"
          className={chipClass(selectedChip === 'hour-16')}
          onClick={() => onSelectHour(16)}
        >
          4pm
        </button>
        <button
          type="button"
          className={chipClass(selectedChip === 'hour-20')}
          onClick={() => onSelectHour(20)}
        >
          8pm
        </button>
        <span className="relative">
          <button
            type="button"
            className={chipClass(selectedChip === 'date')}
            onClick={openDatePicker}
            aria-label={`Pick a date (currently ${dateChipLabel})`}
          >
            <Calendar size={14} aria-hidden="true" />
            {dateChipLabel}
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
    </nav>
  );
}
