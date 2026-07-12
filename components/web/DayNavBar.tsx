import type { PublicStreamSlot } from '@/lib/server/partner-api';
import { resolveUiLang } from '@/lib/i18n-core';
import { slotLexFor } from '@/lib/i18n-slot';
import { utcDateShortLabel } from '@/lib/format/time';

interface Props {
  days: string[];
  grouped: Map<string, PublicStreamSlot[]>;
  todayUtc: string;
  /** Localizes day labels/counts/aria; default 'en' keeps the game-page caller byte-identical. */
  language?: string;
}

export function DayNavBar({ days, grouped, todayUtc, language = 'en' }: Props) {
  const L = slotLexFor(language);
  const lang = resolveUiLang(language);
  return (
    <nav
      aria-label={L.jumpToDayAria}
      className="sticky top-[var(--header-height)] z-10 -mx-4 mt-8 mb-2 border-b border-divider bg-background/95 px-4 py-3 backdrop-blur"
    >
      <ul className="flex gap-2 overflow-x-auto" role="list">
        {days.map((dateKey) => {
          const count = grouped.get(dateKey)?.length ?? 0;
          const label = utcDateShortLabel(dateKey, todayUtc, lang);
          const disabled = count === 0;
          const dayNum = new Date(dateKey + 'T00:00:00Z').getUTCDate();
          if (disabled) {
            return (
              <li key={dateKey}>
                <span
                  className="inline-flex flex-col items-center rounded-lg border border-border-default/40 bg-background-elevated/40 px-3 py-1.5 text-xs text-text-muted opacity-50"
                  aria-disabled="true"
                >
                  <span className="font-semibold">{label}</span>
                  <span className="text-[10px]">{dayNum}</span>
                </span>
              </li>
            );
          }
          return (
            <li key={dateKey}>
              <a
                href={`#day-${dateKey}`}
                className="inline-flex flex-col items-center rounded-lg border border-border-default bg-background-elevated px-3 py-1.5 text-xs transition-colors hover:border-accent-cyan/60 hover:bg-background-highlight"
              >
                <span className="font-semibold text-text-primary">{label}</span>
                <span className="text-[10px] text-accent-cyan">
                  {L.nStreams(count)}
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
