import type { PublicStreamSlot } from '@/lib/server/partner-api';
import { slotLexFor } from '@/lib/i18n-slot';
import { SlotCard } from './SlotCard';

interface Props {
  dateKey: string;
  label: string;
  slots: PublicStreamSlot[];
  /** Localizes counts/aria + the nested SlotCards; default 'en' keeps the game-page caller byte-identical. */
  language?: string;
}

export function DaySection({ dateKey, label, slots, language = 'en' }: Props) {
  const L = slotLexFor(language);
  return (
    <section
      id={`day-${dateKey}`}
      aria-labelledby={`heading-${dateKey}`}
      className="mt-10 scroll-mt-[calc(var(--header-height)+5rem)]"
    >
      <h2
        id={`heading-${dateKey}`}
        className="text-2xl font-bold text-white mb-4 flex items-baseline gap-3"
      >
        {label}
        <span className="text-sm font-normal text-text-muted">
          {L.nStreams(slots.length)}
        </span>
      </h2>
      <ul className="grid gap-3" aria-label={L.streamsOnAria(label)}>
        {slots.map((slot) => (
          <li key={slot.id}>
            <SlotCard slot={slot} language={language} />
          </li>
        ))}
      </ul>
    </section>
  );
}
