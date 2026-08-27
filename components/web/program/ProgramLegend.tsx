'use client';

// "How to read this page" disclosure (UX round 2026-07-23) — the Program page
// leans on badge semantics (confidence tiers, NEW/UNCERTAIN/CANCELLED) that
// are obvious to us and cryptic to new users. Renders the REAL badge
// components so the legend can never drift from the cards.

import { useId, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, Info } from 'lucide-react';
import {
  CancelledBadge,
  ConfidenceBadge,
  LiveBadge,
  NewBadge,
  UncertainBadge,
} from '@/components/web/Badges';

function LegendRow({ badge, text }: { badge: React.ReactNode; text: string }) {
  return (
    <li className="flex items-start gap-3">
      <span className="flex w-24 shrink-0 flex-wrap items-center gap-1 pt-0.5">{badge}</span>
      <span className="text-xs text-text-secondary">{text}</span>
    </li>
  );
}

export function ProgramLegend() {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-muted transition-colors hover:text-accent-cyan"
      >
        <Info size={13} aria-hidden="true" />
        How to read this page
        <ChevronDown
          size={13}
          aria-hidden="true"
          className={`transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          id={panelId}
          className="mt-2 rounded-xl border border-border-default bg-background-elevated p-4"
        >
          <p className="text-xs text-text-secondary">
            Most entries are <strong className="text-text-primary">predictions</strong>: we
            estimate when your favorites go live from their streaming history, announced
            schedules and what they said on stream. Live entries are real-time data.
          </p>
          <ul className="mt-3 space-y-2.5">
            <LegendRow badge={<LiveBadge />} text="Streaming right now — tap Watch to jump in." />
            <LegendRow
              badge={
                <>
                  <ConfidenceBadge level="high" size="sm" />
                  <ConfidenceBadge level="low" size="sm" />
                </>
              }
              text="How sure we are about a predicted time (high / medium / low)."
            />
            <LegendRow
              badge={<NewBadge />}
              text="A time outside the streamer's usual pattern — freshly announced or detected."
            />
            <LegendRow
              badge={<UncertainBadge />}
              text="The streamer recently missed predicted streams — take this one with a grain of salt."
            />
            <LegendRow
              badge={<CancelledBadge />}
              text="No stream expected at a usually-regular time (announced break or withdrawn schedule)."
            />
          </ul>
          <p className="mt-3 text-xs text-text-muted">
            <strong className="text-text-secondary">Missed</strong> lists streams of your
            favorites that ended within the last 6 hours;{' '}
            <strong className="text-text-secondary">Offline today</strong> lists favorites
            without a stream or prediction today. All times are shown in your local timezone.
          </p>
          <p className="mt-3 text-xs">
            <Link
              href="/methodology/predictions"
              className="font-semibold text-accent-cyan hover:text-text-primary"
            >
              How predictions and confidence levels work →
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
